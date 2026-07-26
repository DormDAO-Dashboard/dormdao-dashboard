// Registry of every automated email DormDAO sends, plus the small amount of
// copy in each one that admins can edit from /admin/email. The surrounding
// HTML chrome (header bar, data tables, CTA buttons, unsubscribe footer) stays
// code-managed — only the human-authored subject/heading/message text is
// editable, so an admin typo can't break an email's structure.

export interface EmailTemplateField {
  key: string;
  label: string;
  default: string;
  multiline?: boolean;
}

export interface EmailTemplateDef {
  key: string;
  label: string;
  trigger: string;
  variables: string[];
  fields: EmailTemplateField[];
  // Sample values used to render the "View" preview.
  sampleVars: Record<string, string>;
}

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  {
    key: "onboarding_invite",
    label: "Onboarding Email",
    trigger: "Sent when an admin imports a member with “Send email to members” checked, clicks the onboarding-email button next to a member, or approves a signup request. If the member has a wallet on file, a fixed \"We have a wallet on file ending in ####\" line is automatically appended below the message and isn't editable here.",
    variables: ["name", "school"],
    fields: [
      { key: "subject", label: "Subject", default: "You're invited to DormDAO — {{school}}" },
      { key: "heading", label: "Heading", default: "Welcome to DormDAO, {{name}}!" },
      {
        key: "message", label: "Message", multiline: true,
        default: "Your account is open — you've been invited to join the {{school}} chapter on DormDAO, where university crypto clubs manage portfolios and vote on investments.\n\nYou can sign in with your email or your connected wallet to set up your profile and start participating.",
      },
    ],
    sampleVars: { name: "Jane Doe", school: "Blockchain at Berkeley" },
  },
  {
    key: "new_proposal",
    label: "New Proposal Posted",
    trigger: "Sent to all opted-in members of a school when a new token proposal is created for a vote.",
    variables: ["ticker", "tokenName", "school", "title"],
    fields: [
      { key: "subject", label: "Subject", default: "🗳️ New proposal: {{ticker}} — {{school}}" },
      { key: "heading", label: "Heading", default: "New proposal: {{title}}" },
      { key: "message", label: "Message (optional, shown below the proposal details)", multiline: true, default: "" },
    ],
    sampleVars: { ticker: "ETH", tokenName: "Ethereum", school: "Blockchain at Berkeley", title: "Add ETH to treasury" },
  },
  {
    key: "proposal_reminder_12h",
    label: "12-Hour Voting Reminder",
    trigger: "Sent when a proposal has about 12 hours left before its voting deadline closes.",
    variables: ["ticker", "school", "title"],
    fields: [
      { key: "subject", label: "Subject", default: "⏰ 12h left to vote: {{ticker}} — {{school}}" },
      { key: "heading", label: "Heading", default: "12 hours left: {{title}}" },
      { key: "message", label: "Message (shown below the current vote tally)", multiline: true, default: "If you haven't voted yet, now is the time." },
    ],
    sampleVars: { ticker: "ETH", school: "Blockchain at Berkeley", title: "Add ETH to treasury" },
  },
  {
    key: "proposal_result",
    label: "Proposal Result (Passed / Rejected)",
    trigger: "Sent when a proposal's voting deadline passes and it resolves as passed or rejected.",
    variables: ["ticker", "school", "title", "resultLabel", "resultEmoji"],
    fields: [
      { key: "subject", label: "Subject", default: "{{resultEmoji}} {{resultLabel}}: {{ticker}} — {{school}}" },
      { key: "heading", label: "Heading", default: "{{resultEmoji}} Proposal {{resultLabel}}: {{title}}" },
      { key: "messagePassed", label: "Message when passed", multiline: true, default: "Club leadership will review and execute the trade if approved." },
      { key: "messageRejected", label: "Message when rejected", multiline: true, default: "This proposal did not receive enough votes to pass." },
    ],
    sampleVars: { ticker: "ETH", school: "Blockchain at Berkeley", title: "Add ETH to treasury", resultLabel: "Passed", resultEmoji: "✅" },
  },
  {
    key: "trade_executed",
    label: "Trade Executed",
    trigger: "Sent when club leadership marks an approved proposal's trade as executed.",
    variables: ["ticker", "school", "title"],
    fields: [
      { key: "subject", label: "Subject", default: "🚀 Trade executed: {{ticker}} — {{school}}" },
      { key: "heading", label: "Heading", default: "Trade executed: {{title}}" },
      { key: "message", label: "Message (optional, shown below the trade summary)", multiline: true, default: "" },
    ],
    sampleVars: { ticker: "ETH", school: "Blockchain at Berkeley", title: "Add ETH to treasury" },
  },
];

export function getEmailTemplateDef(key: string): EmailTemplateDef | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}

// Substitutes {{variable}} tokens; unknown tokens resolve to an empty string.
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
