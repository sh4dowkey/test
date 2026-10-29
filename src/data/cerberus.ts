/**
 * Project Cerberus: simulation fixtures.
 *
 * PROVENANCE
 *  - Architecture, addressing, accounts, template name, queries and Sigma rule logic come from the owner's
 *    "Project Cerberus" PDF (Combine-1,2.pdf). The PDF is a DESIGN: it is not evidence that anything is deployed.
 *    Credentials, tool commands and PowerShell from the PDF are deliberately NOT reproduced here.
 *  - What is actually built comes from the public repo sh4dowkey/ad-attack-defense-lab: DC01 (Windows Server 2019,
 *    192.168.10.10, domain corp.local) and WIN10-1 (domain-joined Windows 10). Its addressing and domain differ
 *    from the Cerberus design (192.168.56.0/24, cerberus.local), so those hosts are shown as "built in the lab repo",
 *    not as a finished Cerberus build. Everything else is planned.
 *  - Every event, timestamp and alert below is an ILLUSTRATIVE FIXTURE written to match the PDF's described
 *    artifacts (event IDs, field names, accounts). Nothing was captured from a running lab. Events marked
 *    `inferred` are ones the PDF implies but does not enumerate.
 *  - The shapes (machines, events, alerts, rules, hunts, timeline) are plain typed arrays so a read-only API in front
 *    of a real SIEM could later supply them without changing the views (see docs/CERBERUS-LIVE.md).
 */
export type Build = 'repo' | 'unverified' | 'planned';
export const buildLabel: Record<Build, string> = { repo: 'Built in the lab repo', unverified: 'Mapping unconfirmed', planned: 'Planned (design)' };

export const lab = { domain: 'cerberus.local', network: 'CERBERUS-LAB-NET', subnet: '192.168.56.0/24', isolation: 'Host-only or internal network, no internet after setup' };

export interface Machine { id: string; name: string; role: string; os: string; ip: string; ram: string; cpu: string; plate: 'siem' | 'lab' | 'atk'; build: Build; note?: string; review?: string }
export const machines: Machine[] = [
  { id: 'dc01', name: 'DC01', role: 'Domain controller, DNS', os: 'Windows Server 2019/2022', ip: '192.168.56.10', ram: '4 GB', cpu: '2 cores', plate: 'lab', build: 'repo', note: 'The lab repo builds a DC01 on 192.168.10.10 (corp.local), not this addressing.', review: 'Confirm whether the repo DC01 becomes the Cerberus DC01.' },
  { id: 'ca01', name: 'CA01', role: 'Enterprise CA, AD CS honeypot', os: 'Windows Server 2019/2022', ip: '192.168.56.11', ram: '2 GB', cpu: '2 cores', plate: 'lab', build: 'planned' },
  { id: 'srv01', name: 'SRV01', role: 'Member server (file/app)', os: 'Windows Server 2019/2022', ip: '192.168.56.20', ram: '2 GB', cpu: '2 cores', plate: 'lab', build: 'planned' },
  { id: 'ws01', name: 'WS01', role: 'Victim workstation', os: 'Windows 10/11 Enterprise', ip: '192.168.56.101', ram: '2 GB', cpu: '1 core', plate: 'lab', build: 'unverified', note: 'The lab repo builds WIN10-1 (Windows 10 Pro, domain-joined).', review: 'Confirm whether WIN10-1 becomes WS01.' },
  { id: 'siem01', name: 'SIEM01', role: 'SIEM and logging node', os: 'Ubuntu Server (LTS)', ip: '192.168.56.50', ram: '4 GB', cpu: '2 cores', plate: 'siem', build: 'planned' },
  { id: 'kali', name: 'KALI', role: 'Attacker machine', os: 'Kali Linux', ip: 'DHCP', ram: '2 GB', cpu: '2 cores', plate: 'atk', build: 'planned', note: 'Listed as coming soon in the lab repo.' },
];

/** Components of the telemetry pipeline, in order (from the PDF). */
export const pipeline = ['Sysmon', 'Winlogbeat', 'Elasticsearch / OpenSearch', 'Sigma rules', 'Alert'];

export interface Phase { id: string; name: string; dur: number; technique: string; text: string; focus: string[] }
export const phases: Phase[] = [
  { id: 'recon', name: 'Environment and reconnaissance', dur: 7600, technique: 'Reconnaissance', focus: ['dc01'], text: 'Six machines on an isolated network. From the low-privilege account alice, the attacker maps the domain to find Kerberoastable service accounts and a vulnerable-looking certificate template.' },
  { id: 'cred', name: 'Credential access', dur: 5800, technique: 'T1558.003 Kerberoasting', focus: ['dc01'], text: 'Service tickets are requested for the two service accounts that have SPNs. The domain controller logs 4769 events; RC4 (0x17) is the tell.' },
  { id: 'lateral', name: 'Lateral movement', dur: 5800, technique: 'T1021.002 SMB / Windows Admin Shares', focus: ['srv01'], text: 'With the service account, the attacker reaches the member server over SMB. A service binary runs and a named pipe appears on SRV01.' },
  { id: 'adcs', name: 'AD CS abuse attempt', dur: 5200, technique: 'T1649 Steal or Forge Authentication Certificates', focus: ['ca01'], text: 'A certificate is requested from the lure template, with an administrator UPN in the Subject Alternative Name. The policy module denies it, but CA01 has already logged the request.' },
  { id: 'alert', name: 'Deception alert', dur: 5000, technique: 'Deception, high fidelity', focus: ['ca01', 'siem01'], text: 'No legitimate user touches the honeypot template, so the Sigma rule alerts at critical severity. This is the lead the hunt starts from.' },
  { id: 'hunt', name: 'Threat hunting and correlation', dur: 8200, technique: 'Hunt', focus: ['siem01'], text: 'Starting from alice, the analyst pivots in Kibana to the Kerberos burst and the PsExec artifacts, then rebuilds the chain.' },
  { id: 'rules', name: 'Detection rules and incident summary', dur: 9000, technique: 'Sigma', focus: ['siem01'], text: 'The hunt is codified as six Sigma rules: three deception rules and three TTP rules. Three of them fired in this scenario.' },
  { id: 'reset', name: 'Return to the initial state', dur: 2600, technique: '', focus: [], text: '' },
];

export interface Ev { id: string; phase: number; at: number; host: string; channel: string; code: number; user: string; summary: string; fields: Record<string, string>; rule?: string; benign?: boolean; inferred?: boolean }
export const events: Ev[] = [
  { id: 'E-01', phase: 0, at: 1400, host: 'ws01', channel: 'Security', code: 4624, user: 'alice', summary: 'Interactive logon of a normal user', fields: { LogonType: '2', TargetUserName: 'alice' }, benign: true },
  { id: 'E-02', phase: 0, at: 4900, host: 'dc01', channel: 'Sysmon', code: 3, user: '-', summary: 'Inbound LDAP and SMB connections from KALI', fields: { Initiated: 'false', SourceHostname: 'KALI', DestinationPort: '389, 445' }, inferred: true },
  { id: 'E-03', phase: 0, at: 5800, host: 'dc01', channel: 'Sysmon', code: 3, user: '-', summary: 'Repeated directory queries from the same source', fields: { Initiated: 'false', SourceHostname: 'KALI', DestinationPort: '389' }, inferred: true },
  { id: 'E-04', phase: 1, at: 700, host: 'dc01', channel: 'Security', code: 4769, user: 'DC01$', summary: 'Service ticket for a machine account (AES)', fields: { ServiceName: 'DC01$', TicketEncryptionType: '0x12' }, benign: true },
  { id: 'E-05', phase: 1, at: 1700, host: 'dc01', channel: 'Security', code: 4769, user: 'alice', summary: 'RC4 service ticket requested for svc_mssql', fields: { ServiceName: 'svc_mssql', TicketEncryptionType: '0x17', ClientHost: 'WS01' }, rule: 'R4' },
  { id: 'E-06', phase: 1, at: 2400, host: 'dc01', channel: 'Security', code: 4769, user: 'alice', summary: 'RC4 service ticket requested for svc_webapp', fields: { ServiceName: 'svc_webapp', TicketEncryptionType: '0x17', ClientHost: 'WS01' }, rule: 'R4' },
  { id: 'E-07', phase: 1, at: 3000, host: 'dc01', channel: 'Security', code: 4769, user: 'alice', summary: 'Second RC4 ticket for svc_mssql in the burst', fields: { ServiceName: 'svc_mssql', TicketEncryptionType: '0x17', ClientHost: 'WS01' }, rule: 'R4' },
  { id: 'E-08', phase: 2, at: 700, host: 'srv01', channel: 'Sysmon', code: 3, user: '-', summary: 'SMB (445) connection from KALI', fields: { Initiated: 'false', SourceHostname: 'KALI', DestinationPort: '445' } },
  { id: 'E-09', phase: 2, at: 2000, host: 'srv01', channel: 'Sysmon', code: 1, user: 'svc_mssql', summary: 'PSEXESVC.exe started by services.exe', fields: { Image: '\\PSEXESVC.exe', ParentImage: '\\services.exe' }, rule: 'R5' },
  { id: 'E-10', phase: 2, at: 2700, host: 'srv01', channel: 'Sysmon', code: 17, user: 'svc_mssql', summary: 'Named pipe psexesvc created', fields: { PipeName: '\\psexesvc' } },
  { id: 'E-11', phase: 3, at: 1700, host: 'ca01', channel: 'Security', code: 4886, user: 'alice', summary: 'Certificate request for the honeypot template', fields: { Requester: 'CERBERUS\\alice', TemplateName: 'CERBERUS_WebServer_ESC1', SubjectAlternativeName: 'administrator@cerberus.local', Outcome: 'denied by the policy module' }, rule: 'R1' },
];

export interface Rule { id: string; title: string; level: 'critical' | 'high' | 'medium'; kind: 'Deception' | 'TTP'; logic: string; tags: string }
export const rules: Rule[] = [
  { id: 'R1', title: 'AD CS Honeypot Certificate Request', level: 'critical', kind: 'Deception', logic: 'EventID 4886 and TemplateName = CERBERUS_WebServer_ESC1', tags: 'T1649' },
  { id: 'R2', title: 'Honeytoken User Logon Attempt', level: 'high', kind: 'Deception', logic: 'EventID 4625 and TargetUserName = svc_admin_backup', tags: 'T1110.001' },
  { id: 'R3', title: 'Honeytoken File Accessed', level: 'high', kind: 'Deception', logic: 'EventID 4663 and ObjectName contains Confidential_Salaries_2024.xlsx', tags: 'T1082' },
  { id: 'R4', title: 'Potential Kerberoasting Activity (RC4)', level: 'medium', kind: 'TTP', logic: 'EventID 4769 and TicketEncryptionType 0x17, excluding names ending in $ and krbtgt', tags: 'T1558.003' },
  { id: 'R5', title: 'PsExec Service Execution', level: 'medium', kind: 'TTP', logic: 'Image ends with \\PSEXESVC.exe and ParentImage ends with \\services.exe', tags: 'T1569.002' },
  { id: 'R6', title: 'Potential Access Token Impersonation', level: 'medium', kind: 'TTP', logic: 'EventID 4624, LogonType 9, LogonProcessName Advapi', tags: 'T1134.001' },
];
/** Rules that the fixture events match. The others exist in the rulebook but are not triggered by this scenario. */
export const fired = new Set(['R1', 'R4', 'R5']);

export interface Alert { id: string; rule: string; phase: number; at: number; host: string; user: string; evidence: string[]; summary: string }
export const alerts: Alert[] = [
  { id: 'A-1', rule: 'R4', phase: 1, at: 4000, host: 'dc01', user: 'alice', evidence: ['E-05', 'E-06', 'E-07'], summary: 'Three RC4 service tickets in a burst from alice' },
  { id: 'A-2', rule: 'R5', phase: 2, at: 3500, host: 'srv01', user: 'svc_mssql', evidence: ['E-09'], summary: 'PSEXESVC.exe launched by services.exe on SRV01' },
  { id: 'A-3', rule: 'R1', phase: 4, at: 900, host: 'ca01', user: 'alice', evidence: ['E-11'], summary: 'Certificate request for the honeypot template, target administrator' },
];

export interface Hunt { id: string; at: number; query: string; ids: string[]; found: string }
export const hunts: Hunt[] = [
  { id: 'H1', at: 900, query: 'winlog.event_id: 4769 AND user.name: "alice" AND winlog.event_data.TicketEncryptionType: "0x17"', ids: ['E-05', 'E-06', 'E-07'], found: 'Burst of RC4 ticket requests for svc_mssql and svc_webapp' },
  { id: 'H2', at: 3500, query: '(winlog.event_id: 1 AND process.name: "PSEXESVC.exe") OR (winlog.event_id: 17 AND winlog.event_data.PipeName: "\\psexesvc")', ids: ['E-09', 'E-10'], found: 'PsExec artifacts on SRV01, source traced to KALI through Sysmon 3' },
];

export interface TL { at: number; label: string; text: string; refs: string[] }
export const timeline: TL[] = [
  { at: 1000, label: 'Reconnaissance', text: 'Domain mapped from alice’s foothold (inferred from the targeted attacks that follow).', refs: ['E-02', 'E-03'] },
  { at: 2400, label: 'Credential access', text: 'Kerberoasting against DC01 harvested service-account tickets.', refs: ['E-05', 'E-06', 'E-07'] },
  { at: 4200, label: 'Lateral movement', text: 'Harvested credentials used to reach SRV01 through PsExec.', refs: ['E-08', 'E-09', 'E-10'] },
  { at: 5800, label: 'Privilege escalation attempt', text: 'AD CS abuse attempted on CA01; the honeypot logged it and no certificate was issued.', refs: ['E-11'] },
];

/** What a genuine connection would need. */
export const liveRequirements: [string, string][] = [
  ['Lab', 'The six VMs running, with Sysmon and Winlogbeat on the four Windows hosts.'],
  ['SIEM', 'Elastic Stack or OpenSearch on SIEM01 with the Sigma rules converted and enabled.'],
  ['Read-only API', 'A small service beside the SIEM exposing searches, alerts and rule status. No attack functions.'],
  ['Transport', 'One-way export of redacted events from the lab, never an inbound path into it.'],
];
