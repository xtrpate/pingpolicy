# Research notes: existing projects and PingPolicy scope

Research date: 2026-11-06.

This document records product-level comparisons. It does not claim that PingPolicy's broad concept is unique.

## References reviewed

1. **Novu** — https://github.com/novuhq/novu  
   Broad notification infrastructure: workflows, subscribers, preferences, inbox, provider integrations, and multiple delivery channels. Its REST API exposes subscriber preference read/update operations.
2. **notifkit** — https://github.com/devkitshq/notifkit  
   Self-hosted notification infrastructure including multiple channels, preferences, quiet hours, retries, scheduling, and delivery logs.
3. **notification-preferences-api** — https://github.com/jwear/notification-preferences-api  
   A small Express example with in-memory CRUD routes for preferences. It is a learning/demo API and is not a multi-tenant, persistent hosted service.
4. **NotificationPreferencesAPI** — https://github.com/macroactive-intern/NotificationPreferencesAPI  
   A Laravel/PHP project described as managing channel preferences by event type.

## Comparison

| Capability | Small CRUD example | Novu / notifkit | PingPolicy MVP |
|---|---|---|---|
| Preference CRUD | Yes | Yes | Yes |
| Durable MySQL storage | Not in reviewed Express example | Project-specific storage | Yes |
| Project-scoped API key boundary | Not in reviewed Express example | Mature platform authentication model | Basic project key boundary |
| Dedicated policy-check endpoint | Not shown in reviewed Express README | Preference checks are part of larger systems | Yes |
| Sends notifications | No | Yes | No |
| Full workflows / retries / providers | No | Yes | No |

## Product hypothesis

PingPolicy aims to be a narrow, provider-independent policy/preferences service, not a replacement for a full notification delivery platform. The explicit policy-check endpoint and default-deny behavior are useful API semantics to test with developers.

This differentiation is a hypothesis, not proven market demand. Developers may prefer preference features already included with their notification provider. Validate with a demo and developer feedback before adding billing.

## Originality and attribution

- No source code was copied from the projects above.
- The implementation and documentation in this repository were written independently.
- General concepts such as REST, API keys, preference records, and CRUD operations are common patterns and are not claimed as original inventions.
- This research is not legal advice or a guarantee of non-infringement.
