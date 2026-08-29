# Provider compatibility

The JSON contract is provider-neutral. End-to-end support is a stronger claim.

| Path                                   | v0.1.1 status            | Evidence required for the stated status                                |
| -------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| Local mock tutorial                    | Maintained               | Retry, atomicity, accessibility, and build tests in CI                 |
| ChatGPT scheduled task                 | Target first hosted path | Not provider-certified until a recorded synthetic end-to-end run       |
| Command adapter                        | Maintained               | Exact JSON on stdout and trusted local validation                      |
| Claude, Gemini, other hosted workflows | Contract compatible      | Community recipe until its complete path has a repeatable release test |

Foundation releases may publish provider-neutral contracts without certifying a hosted provider. A release that claims a hosted path as maintained must record prompt generation, permission review, complete-source publication, independent validation, and dashboard refresh using synthetic data.

Zaati OS does not bundle provider connectors. Availability, permissions, retention, pricing, and scheduled-task behavior belong to the chosen provider.
