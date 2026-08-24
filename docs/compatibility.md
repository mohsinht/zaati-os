# Provider compatibility

The JSON contract is provider-neutral. End-to-end support is a stronger claim.

| Path                                   | v0.1.1 status              | Required release evidence                                              |
| -------------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| Local mock tutorial                    | Maintained                 | Retry, atomicity, accessibility, and build tests in CI                 |
| ChatGPT scheduled task                 | Target first real workflow | A recorded synthetic provider run is still required before release     |
| Command adapter                        | Maintained                 | Exact JSON on stdout and trusted local validation                      |
| Claude, Gemini, other hosted workflows | Contract compatible        | Community recipe until its complete path has a repeatable release test |

Zaati OS does not bundle provider connectors. Availability, permissions, retention, pricing, and scheduled-task behavior belong to the chosen provider.
