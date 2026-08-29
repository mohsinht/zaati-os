const stripHeading = (markdown) => markdown.trim().replace(/^# .+\n+/, "")

const nestHeadings = (markdown) => markdown.trim().replace(/^(#{1,4}) /gm, (_, hashes) => `${"#".repeat(Math.min(6, hashes.length + 2))} `)

const resolveRegistration = (markdown, definition) =>
  markdown.replaceAll("{{SOURCE_ID}}", definition.id).replaceAll("{{WORKER_ID}}", definition.worker_id)

export function assembleStandaloneDemoPrompt({
  basePrompt,
  domainPrompt,
  definition,
  snapshotSchema,
  uiBlocksSchema,
  domainSchema,
  llmContract,
  privacyContract,
}) {
  const workerInstructions = resolveRegistration(stripHeading(basePrompt), definition)
    .replace(/^Copy this contract together with one domain prompt[^\n]*\n+/, "")
    .replace("- the domain prompt supplied with this contract", "- the embedded domain instructions in this document")
  const domainInstructions = resolveRegistration(stripHeading(domainPrompt), definition)
    .replace(/^Use with \[`base-worker\.md`\]\(base-worker\.md\)\.\n+/, "")
    .replace(
      `Set ${definition.id} to ${definition.id} and ${definition.worker_id} to ${definition.worker_id}.`,
      `This document is registered for source ${definition.id} and worker ${definition.worker_id}.`,
    )
  const embeddedLlmContract = llmContract.replace(/^Use \[`prompts\/base-worker\.md`\][^\n]*\n+/m, "")
  const json = (value) => JSON.stringify(value, null, 2)

  return `# ${definition.label} scheduled-task prompt

> This is a standalone Zaati OS prompt. The worker instructions, registered source, permission boundary, and current executable schemas are embedded below; no linked local prompt file is required.

## Replace before scheduling

Replace these three environment-specific placeholders everywhere they appear:

- \`{{CODE_REPOSITORY}}\` — the public Zaati OS code repository
- \`{{DATA_REPOSITORY}}\` — the private repository that owns real snapshots
- \`{{TIMEZONE}}\` — the user's IANA timezone, such as \`Asia/Karachi\`

The source and worker identifiers are already resolved to \`${definition.id}\` and \`${definition.worker_id}\`. Review the embedded permission boundary before giving the workflow access to any source.

## Worker instructions

${workerInstructions}

## Domain instructions

${domainInstructions}

## Registered source and permission boundary

\`\`\`json
${json(definition)}
\`\`\`

## Snapshot envelope schema

\`\`\`json
${json(snapshotSchema)}
\`\`\`

## Safe UI blocks schema

\`\`\`json
${json(uiBlocksSchema)}
\`\`\`

## Registered domain schema

\`\`\`json
${json(domainSchema)}
\`\`\`

## LLM contract

The embedded contract is the copy-time baseline. The worker must still read and obey the current default-branch files on every run and stop if they are missing or incompatible.

${nestHeadings(embeddedLlmContract)}

## Privacy contract

${nestHeadings(privacyContract)}
`
}
