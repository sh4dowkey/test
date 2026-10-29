/**
 * Project Cerberus: simulation fixtures.
 *
 * PROVENANCE (read before editing)
 *  - The Cerberus architecture PDF was NOT available to the engineer who wrote this file. The machine list, roles and
 *    pipeline components come from the owner's written brief that summarises the PDF (six VMs, Sysmon, Winlogbeat,
 *    Elastic Stack or OpenSearch, an AD CS honeypot, Sigma rules, a multi-stage intrusion emulation).
 *  - What is actually built comes from the public repo sh4dowkey/ad-attack-defense-lab: DC01 (Windows Server 2019,
 *    192.168.10.10, AD DS + DNS, domain corp.local) and WIN10-1 (Windows 10 Pro, domain-joined). Kali, users/OUs,
 *    attack chains and detection are listed there as planned. That repo gives Kali two different addresses
 *    (.100 and .30), so no Kali address is shown.
 *  - Every event, alert, rule and timeline entry below is an ILLUSTRATIVE FIXTURE. Event IDs are the standard
 *    Windows / Sysmon ones; the account names, template name and timings are invented. None of it was captured
 *    from a running lab. Items marked `review` must be checked against the PDF before they are presented as design facts.
 *  - Nothing here executes anything. The data describes what a defender would see, not how to cause it.
 */
export type Status = 'built' | 'unverified' | 'planned';

export const cerberusMeta = {
  heading: 'Project Cerberus',
  network: 'Isolated lab network',
  networkNote: 'Host-only, no route to the internet (isolated design, per the brief).',
  repoUrl: 'https://github.com/sh4dowkey/ad-attack-defense-lab',
  banner: 'Simulation. Fixture events replayed in your browser; no VMs, SIEM or attacks are running.',
};

export const statusLabel: Record<Status, string> = { built: 'Built (public repo)', unverified: 'Unverified', planned: 'Planned' };

export interface Machine { id: string; name: string; role: string; os?: string; ip?: string; status: Status; x: number; y: number; source: string; services: { name: string; status: Status }[]; review?: string }
export const machines: Machine[] = [
  { id: 'dc01', name: 'DC01', role: 'Domain controller and DNS', os: 'Windows Server 2019', ip: '192.168.10.10', status: 'built', x: 380, y: 175, source: 'Public repo README and setup/DC01',
    services: [{ name: 'AD DS (corp.local)', status: 'built' }, { name: 'DNS', status: 'built' }, { name: 'Sysmon', status: 'planned' }, { name: 'Winlogbeat', status: 'planned' }] },
  { id: 'ca01', name: 'CA01', role: 'Certificate authority and AD CS deception', status: 'planned', x: 620, y: 95, source: 'Cerberus plan (from the brief)',
    services: [{ name: 'AD CS', status: 'planned' }, { name: 'Honeypot certificate template', status: 'planned' }, { name: 'Sysmon', status: 'planned' }, { name: 'Winlogbeat', status: 'planned' }], review: 'OS, address and template name not confirmed.' },
  { id: 'srv01', name: 'SRV01', role: 'Member and file server', status: 'planned', x: 620, y: 255, source: 'Cerberus plan (from the brief)',
    services: [{ name: 'File services', status: 'planned' }, { name: 'Sysmon', status: 'planned' }, { name: 'Winlogbeat', status: 'planned' }], review: 'OS and address not confirmed.' },
  { id: 'ws01', name: 'WS01', role: 'Victim workstation', os: 'Windows 10 Pro (WIN10-1 in the repo)', status: 'unverified', x: 380, y: 330, source: 'Cerberus plan; the repo builds WIN10-1',
    services: [{ name: 'Domain join (corp.local)', status: 'built' }, { name: 'Sysmon', status: 'planned' }, { name: 'Winlogbeat', status: 'planned' }], review: 'The repo builds WIN10-1. Whether it becomes WS01 is not confirmed.' },
  { id: 'siem01', name: 'SIEM01', role: 'Logging and SIEM', status: 'planned', x: 140, y: 175, source: 'Cerberus plan (from the brief)',
    services: [{ name: 'Elastic Stack or OpenSearch', status: 'planned' }, { name: 'Sigma rules', status: 'planned' }], review: 'Choice of Elastic Stack or OpenSearch not confirmed.' },
  { id: 'kali', name: 'Kali', role: 'Attacker machine', os: 'Kali Linux', status: 'planned', x: 140, y: 345, source: 'Public repo (listed as coming soon)',
    services: [{ name: 'Emulation tooling', status: 'planned' }], review: 'The repo gives two different addresses for Kali, so none is shown.' },
];

export interface Edge { id: string; a: string; b: string; label: string; layer: 'identity' | 'telemetry' | 'attack' }
export const edges: Edge[] = [
  { id: 'ws01-dc01', a: 'ws01', b: 'dc01', label: 'Kerberos, LDAP, DNS', layer: 'identity' },
  { id: 'srv01-dc01', a: 'srv01', b: 'dc01', label: 'Domain membership', layer: 'identity' },
  { id: 'ca01-dc01', a: 'ca01', b: 'dc01', label: 'AD CS enrolment', layer: 'identity' },
  { id: 'dc01-siem01', a: 'dc01', b: 'siem01', label: 'Winlogbeat', layer: 'telemetry' },
  { id: 'ws01-siem01', a: 'ws01', b: 'siem01', label: 'Winlogbeat', layer: 'telemetry' },
  { id: 'srv01-siem01', a: 'srv01', b: 'siem01', label: 'Winlogbeat', layer: 'telemetry' },
  { id: 'ca01-siem01', a: 'ca01', b: 'siem01', label: 'Winlogbeat', layer: 'telemetry' },
  { id: 'kali-dc01', a: 'kali', b: 'dc01', label: 'Emulated traffic', layer: 'attack' },
  { id: 'kali-ws01', a: 'kali', b: 'ws01', label: 'Emulated traffic', layer: 'attack' },
  { id: 'kali-srv01', a: 'kali', b: 'srv01', label: 'Emulated traffic', layer: 'attack' },
  { id: 'kali-ca01', a: 'kali', b: 'ca01', label: 'Emulated traffic', layer: 'attack' },
];

/* ------------------------------------------------------------------ telemetry pipeline */
export interface Stage { id: string; n: string; name: string; where: string; processes: string; input: string; output: string }
export const stages: Stage[] = [
  { id: 'endpoint', n: '1', name: 'Endpoint events', where: 'DC01, CA01, SRV01, WS01', processes: 'Windows Security and System logs, Sysmon operational events and AD CS audit events, written locally on each Windows machine.', input: 'Activity on the host', output: 'Raw event records' },
  { id: 'forward', n: '2', name: 'Forwarding', where: 'Winlogbeat on each Windows VM', processes: 'Reads the event logs, wraps each record with host and agent metadata and ships it to the SIEM host over the isolated network.', input: 'Raw event records', output: 'Shipped events' },
  { id: 'collect', n: '3', name: 'Collection and parsing', where: 'SIEM01 (Elastic Stack or OpenSearch)', processes: 'Receives shipped events, parses the event data and maps it to common fields such as event code, host name and user name.', input: 'Shipped events', output: 'Normalised documents' },
  { id: 'index', n: '4', name: 'Index and search', where: 'SIEM01', processes: 'Stores documents so an analyst can search by host, account, event code or time and pivot between them.', input: 'Normalised documents', output: 'Searchable index' },
  { id: 'detect', n: '5', name: 'Detection rules', where: 'SIEM01 (Sigma rules)', processes: 'Sigma rules describe suspicious patterns once; they are converted to queries for the chosen SIEM and run against incoming documents.', input: 'Searchable index', output: 'Rule matches' },
  { id: 'correlate', n: '6', name: 'Correlation and alerts', where: 'SIEM01', processes: 'Links rule matches that share an account or host within a time window and raises alerts for an analyst to triage.', input: 'Rule matches', output: 'Alerts' },
];

/* ------------------------------------------------------------------ scenario */
export interface Rule { id: string; name: string; severity: 'Low' | 'Medium' | 'High' | 'Critical'; technique: string; logic: string[] }
export const rules: Rule[] = [
  { id: 'R1', name: 'Connection burst from one source', severity: 'Low', technique: 'T1046 Network Service Discovery', logic: ['logsource: sysmon / network_connection', 'selection: one source host, many destination ports', 'condition: selection within 10 seconds'] },
  { id: 'R2', name: 'Kerberos service ticket using RC4 for a user account', severity: 'Medium', technique: 'T1558.003 Kerberoasting', logic: ['logsource: windows / security', 'selection: EventID 4769', 'filter: TicketEncryptionType = 0x17, ServiceName not ending in $', 'condition: selection and filter'] },
  { id: 'R3', name: 'Service account network logon followed by remote service install', severity: 'High', technique: 'T1021.002 SMB/Windows Admin Shares', logic: ['logsource: windows / security, system', 'selection_a: EventID 4624, LogonType 3, account is a service account', 'selection_b: EventID 7045 on the same host', 'condition: selection_a then selection_b within 2 minutes'] },
  { id: 'R4', name: 'Certificate request against the honeypot template', severity: 'Critical', technique: 'T1649 Steal or Forge Authentication Certificates', logic: ['logsource: windows / security (CA)', 'selection: EventID 4886', 'filter: template name = the honeypot template', 'condition: selection and filter (no legitimate user should ever match)'] },
  { id: 'R5', name: 'Correlated chain on one account', severity: 'Critical', technique: 'Correlation of R2, R3 and R4', logic: ['type: correlation', 'rules: R2, R3, R4', 'group-by: user.name', 'timespan: 15 minutes', 'condition: all three rules matched'] },
];

export interface Ev { id: string; t: string; step: number; host: string; channel: string; code: number; user: string; summary: string; fields: Record<string, string>; rules: string[]; benign?: boolean }
export const events: Ev[] = [
  { id: 'E-01', t: '00:00:01', step: 1, host: 'ws01', channel: 'Security', code: 4624, user: 'jdoe', summary: 'Interactive logon of a normal user', fields: { LogonType: '2', TargetUserName: 'jdoe' }, rules: [], benign: true },
  { id: 'E-02', t: '00:00:04', step: 1, host: 'dc01', channel: 'Sysmon', code: 3, user: '-', summary: 'Inbound connections from kali to several ports', fields: { Initiated: 'false', SourceHostname: 'kali', DestinationPorts: '88, 135, 389, 445', Count: '14 in 6 s' }, rules: ['R1'] },
  { id: 'E-03', t: '00:00:05', step: 1, host: 'ws01', channel: 'Sysmon', code: 3, user: '-', summary: 'Inbound connections from kali to several ports', fields: { Initiated: 'false', SourceHostname: 'kali', DestinationPorts: '135, 445, 3389', Count: '9 in 4 s' }, rules: ['R1'] },
  { id: 'E-04', t: '00:01:10', step: 2, host: 'dc01', channel: 'Security', code: 4768, user: 'jdoe', summary: 'Kerberos TGT requested by a normal user', fields: { TargetUserName: 'jdoe', TicketEncryptionType: '0x12' }, rules: [], benign: true },
  { id: 'E-05', t: '00:01:44', step: 2, host: 'dc01', channel: 'Security', code: 4769, user: 'svc-backup', summary: 'Service ticket for a backup service, AES', fields: { ServiceName: 'svc-backup', TicketEncryptionType: '0x12', ClientHost: 'srv01' }, rules: [], benign: true },
  { id: 'E-06', t: '00:02:31', step: 2, host: 'dc01', channel: 'Security', code: 4769, user: 'svc-sql', summary: 'Service ticket for svc-sql requested with RC4', fields: { ServiceName: 'svc-sql', TicketEncryptionType: '0x17', ClientHost: 'kali' }, rules: ['R2'] },
  { id: 'E-07', t: '00:02:33', step: 2, host: 'dc01', channel: 'Security', code: 4769, user: 'svc-sql', summary: 'Second RC4 ticket request for the same account', fields: { ServiceName: 'svc-sql', TicketEncryptionType: '0x17', ClientHost: 'kali' }, rules: ['R2'] },
  { id: 'E-08', t: '00:05:12', step: 3, host: 'srv01', channel: 'Security', code: 4624, user: 'svc-sql', summary: 'Network logon by a service account from kali', fields: { LogonType: '3', TargetUserName: 'svc-sql', WorkstationName: 'kali' }, rules: ['R3'] },
  { id: 'E-09', t: '00:05:12', step: 3, host: 'srv01', channel: 'Security', code: 4672, user: 'svc-sql', summary: 'Special privileges assigned to the new logon', fields: { SubjectUserName: 'svc-sql' }, rules: [] },
  { id: 'E-10', t: '00:05:40', step: 3, host: 'srv01', channel: 'System', code: 7045, user: 'svc-sql', summary: 'A service was installed on the system', fields: { ServiceName: 'FixtureSvc', ServiceType: 'user mode service', StartType: 'demand start' }, rules: ['R3'] },
  { id: 'E-11', t: '00:05:41', step: 3, host: 'srv01', channel: 'Sysmon', code: 1, user: 'svc-sql', summary: 'Process started by the new service', fields: { ParentImage: 'services.exe', Image: 'cmd.exe' }, rules: [] },
  { id: 'E-12', t: '00:08:20', step: 4, host: 'ca01', channel: 'Security', code: 4886, user: 'svc-sql', summary: 'Certificate request received for the honeypot template', fields: { Requester: 'CORP\\svc-sql', Template: 'HoneypotTemplate (placeholder name)', SubjectAltName: 'UPN of a privileged account', Outcome: 'not specified in the sources' }, rules: ['R4'] },
];

export interface Alert { id: string; rule: string; step: number; host: string; user: string; triggers: string[]; summary: string }
export const alerts: Alert[] = [
  { id: 'A-1', rule: 'R1', step: 1, host: 'dc01', user: '-', triggers: ['E-02', 'E-03'], summary: 'Connection bursts from kali to DC01 and WS01' },
  { id: 'A-2', rule: 'R2', step: 2, host: 'dc01', user: 'svc-sql', triggers: ['E-06', 'E-07'], summary: 'RC4 service tickets requested for svc-sql' },
  { id: 'A-3', rule: 'R3', step: 3, host: 'srv01', user: 'svc-sql', triggers: ['E-08', 'E-10'], summary: 'svc-sql network logon, then a service install, on SRV01' },
  { id: 'A-4', rule: 'R4', step: 5, host: 'ca01', user: 'svc-sql', triggers: ['E-12'], summary: 'Certificate request against the honeypot template' },
  { id: 'A-5', rule: 'R5', step: 7, host: 'ca01', user: 'svc-sql', triggers: ['E-06', 'E-08', 'E-12'], summary: 'R2, R3 and R4 all matched for svc-sql within 15 minutes' },
];

export interface Hunt { id: string; label: string; query: string; ids: string[]; step: number }
export const hunts: Hunt[] = [
  { id: 'H1', label: 'RC4 service tickets', query: 'event.code:4769 AND TicketEncryptionType:0x17', ids: ['E-06', 'E-07'], step: 6 },
  { id: 'H2', label: 'Everything for svc-sql', query: 'user.name:svc-sql', ids: ['E-06', 'E-07', 'E-08', 'E-09', 'E-10', 'E-11', 'E-12'], step: 6 },
  { id: 'H3', label: 'Remote service installs', query: 'event.code:7045', ids: ['E-10'], step: 6 },
];

export interface Step { n: number; name: string; technique: string; what: string; sees: string; edges: string[] }
export const steps: Step[] = [
  { n: 1, name: 'Reconnaissance', technique: 'T1046', what: 'The attacker machine probes the domain controller and the workstation for open services.', sees: 'Sysmon network-connection events on the targets show one source touching many ports.', edges: ['kali-dc01', 'kali-ws01'] },
  { n: 2, name: 'Credential access', technique: 'T1558.003', what: 'Service tickets are requested for an account that has a service principal name.', sees: 'The domain controller logs 4769 events. One uses RC4 for svc-sql while the normal backup service uses AES.', edges: ['kali-dc01'] },
  { n: 3, name: 'Lateral movement', technique: 'T1021.002', what: 'The svc-sql account is used for a network logon to the member server, followed by a new service.', sees: 'SRV01 records a type 3 logon from kali, special privileges, a service install and a child process.', edges: ['kali-srv01'] },
  { n: 4, name: 'AD CS abuse attempt', technique: 'T1649', what: 'A certificate is requested from the certificate authority using a template that was left as bait.', sees: 'CA01 records a 4886 certificate request for the honeypot template by svc-sql.', edges: ['kali-ca01'] },
  { n: 5, name: 'Deception alert', technique: 'T1649', what: 'No legitimate user has a reason to touch the honeypot template, so any request is an alert.', sees: 'Rule R4 matches the request and the SIEM raises a critical alert.', edges: ['ca01-siem01'] },
  { n: 6, name: 'Threat hunting', technique: 'Hunt', what: 'An analyst searches the index to find everything related to the alerting account.', sees: 'Three saved searches return the ticket requests, the remote service install and the account’s full activity.', edges: ['dc01-siem01', 'srv01-siem01', 'ca01-siem01'] },
  { n: 7, name: 'Correlated investigation', technique: 'Correlation', what: 'The separate findings are joined into one chain on the account.', sees: 'Correlation rule R5 matches. The timeline ties reconnaissance, ticket requests, logon, service and certificate request together.', edges: ['dc01-siem01', 'srv01-siem01', 'ca01-siem01', 'ws01-siem01'] },
];

export interface TLItem { step: number; t: string; text: string; refs: string[] }
export const timeline: TLItem[] = [
  { step: 6, t: '00:00:04', text: 'Connection bursts from kali reach DC01 and WS01.', refs: ['E-02', 'E-03'] },
  { step: 6, t: '00:02:31', text: 'RC4 service tickets for svc-sql. The backup service’s AES ticket at 00:01:44 is ignored as normal.', refs: ['E-06', 'E-07'] },
  { step: 7, t: '00:05:12', text: 'svc-sql logs on to SRV01 from kali, then a service is installed.', refs: ['E-08', 'E-10'] },
  { step: 7, t: '00:08:20', text: 'svc-sql requests a certificate from the honeypot template on CA01.', refs: ['E-12'] },
  { step: 7, t: '00:08:20', text: 'Conclusion in the fixture: one account, from one source, over eight minutes. Contain svc-sql and rotate its credentials.', refs: ['E-06', 'E-08', 'E-12'] },
];

/** What a real connection would need. Rendered on the page and mirrored in docs/CERBERUS-LIVE.md. */
export const liveRequirements = [
  ['Lab VMs', 'The six machines running, with Sysmon and Winlogbeat on the four Windows hosts.'],
  ['SIEM', 'Elastic Stack or OpenSearch on SIEM01 with the Sigma rules converted and enabled.'],
  ['Read-only API', 'A small service next to the SIEM that exposes searches, alerts and rule status. No attack functions.'],
  ['Transport', 'Lab host to the website through a one-way export of already-redacted events, never an inbound path into the lab.'],
];
