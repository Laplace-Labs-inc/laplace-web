---
title: "Case Study 02: Channel mutex AB-BA"
description: "A disclosure-pending case study on a bounded channel schedule that exposes AB-BA lock ordering."
slug: "channel-mutex-ab-ba"
scenario: "channel_mutex_ab_ba"
library: "crossbeam-channel + parking_lot"
author: "Laplace Labs"
publishedAt: 2026-07-11
updatedAt: 2026-05-28
tags: ["case-study", "crossbeam-channel", "parking_lot", "mutex", "Ki-DPOR"]
cover:
  image: "/assets/case-studies/channel-mutex-ab-ba.svg"
  alt: "AB-BA wait-for graph cover for the channel mutex case study"
  license: "CC-BY-4.0"
seo:
  ogImage: "/assets/case-studies/channel-mutex-ab-ba.svg"
  twitterCard: "summary_large_image"
  jsonLd:
    "@context": "https://schema.org"
    "@type": "Article"
    headline: "Case Study 02: Channel mutex AB-BA"
    datePublished: "2026-07-11"
    author:
      "@type": "Organization"
      name: "Laplace Labs"
reproRepository: "https://github.com/laplace-labs/case-study-02"
reproRepositoryStatus: "placeholder-only-local-task"
disclosure:
  status: "blocked-on-maintainer-notification"
  notifiedOn: null
  publicAfter: null
  notes: "Local draft only. Do not publish until upstream notification and the 30-day waiting period are complete."
license: "CC-BY-4.0"
---

# Case Study 02: Channel mutex AB-BA

## 1. Discovery Context

This case was designed to test whether the Bug DB could distinguish a library bug from a misuse pattern. The surface combines a bounded `crossbeam_channel` with two `parking_lot::Mutex` values. Nothing in the channel implementation promises lock-order safety for user mutexes. The value of the case is that the channel send and receive operations create a scheduling handoff that makes the bad lock order reproducible.

The original experiment came from a BYOC harness that modelled worker A as the producer and worker B as the consumer. Worker A locks `a`, sends a unit message, then tries to lock `b`. Worker B locks `b`, receives the unit message, then tries to lock `a`. In a casual code review, each worker appears to do a small amount of work before crossing into the other resource. Under a bounded channel, the handoff aligns both workers at exactly the wrong time.

Ki-DPOR found the failing schedule quickly because the channel operation is a synchronization boundary. The send makes the receive runnable, and the receive makes the consumer's second lock attempt enabled. Once both second lock attempts are enabled, the AB-BA cycle is concrete.

The external repo placeholder is `https://github.com/laplace-labs/case-study-02`. It must be created later with the same code and a README that states the case is an application-level lock ordering failure. No remote repo was created for this local task.

## 2. Code Reproduction

The minimal repro uses a zero-capacity channel so the handoff is explicit. A capacity-one channel can also reproduce the issue, but the zero-capacity form keeps the trace shorter.

```rust
use crossbeam_channel::bounded;
use parking_lot::Mutex;
use std::sync::Arc;
use std::thread;

fn main() {
    let left = Arc::new(Mutex::new(()));
    let right = Arc::new(Mutex::new(()));
    let (tx, rx) = bounded::<()>(0);

    let a_left = Arc::clone(&left);
    let a_right = Arc::clone(&right);
    let producer = thread::spawn(move || {
        let _left = a_left.lock();
        tx.send(()).unwrap();
        let _right = a_right.lock();
        println!("producer finished");
    });

    let b_left = Arc::clone(&left);
    let b_right = Arc::clone(&right);
    let consumer = thread::spawn(move || {
        let _right = b_right.lock();
        rx.recv().unwrap();
        let _left = b_left.lock();
        println!("consumer finished");
    });

    producer.join().unwrap();
    consumer.join().unwrap();
}
```

The direct run may hang or complete depending on host scheduling. The deterministic run should force this order: producer locks `left`; consumer locks `right`; producer reaches `send`; consumer receives; producer waits on `right`; consumer waits on `left`.

Expected placeholder repo layout:

```text
case-study-02/
  Cargo.toml
  README.md
  src/main.rs
```

The README should include dependency versions and a note that the published repo is a minimized educational repro, not a claim of unsoundness in either dependency.

## 3. Ki-DPOR Search Tree

The ARD-derived search tree has two pruning wins. First, all schedules where worker A obtains both locks before worker B runs are equivalent. Second, all schedules where worker B waits on the channel before holding `right` are safe. The failing region begins only after each worker owns one mutex.

```text
root
|-- A0 lock(left)
|   |-- A1 send waits for recv
|   |   `-- B0 lock(right)
|   |       `-- B1 recv completes send
|   |           |-- A2 lock(right) => waits on B
|   |           `-- B2 lock(left) => waits on A
|   `-- B0 lock(right)
|       `-- A1 send / B1 recv rendezvous
`-- B0 lock(right)
    `-- B1 recv pending
```

The key schedule is not large. The channel rendezvous is a hinge. Once the rendezvous happens, both second-lock operations are enabled, and neither can complete. Ki-DPOR records this as a two-resource wait-for cycle rather than as a channel stall.

The visual SVG cover uses the same shape: two vertical lanes, a horizontal channel rendezvous, and two diagonal lock waits crossing in the middle.

## 4. Equivalence, Sleep Set, Wait-For Graph

The equivalence classes line up with lock ownership. A schedule where only `left` is held is not equivalent to one where only `right` is held, because the next channel operation may enable a different second lock. A schedule where neither worker has crossed the channel boundary can still be pruned aggressively.

The sleep set must retain the rendezvous branch. Send and receive do not commute with the second lock attempts because they change which thread is enabled. That is the central lesson of this case: channel operations are not just message movement. They are scheduling operations.

The wait-for graph at the failure point is the textbook AB-BA graph:

```text
producer -> right mutex -> consumer
consumer -> left mutex -> producer
```

The channel no longer appears as a blocked resource after the rendezvous. It appears in the trace as the event that made the cycle reachable. This distinction matters for remediation. Tuning channel capacity may make the problem rarer, but it does not fix the lock ordering contract.

The case classification is "deterministic lock order violation with channel-enabled schedule." It should be indexed in Bug DB as a misuse pattern with high teaching value.

## 5. Fix Pattern / Avoidance Guide

The durable fix is a single lock order. Both workers must acquire `left` before `right`, or they must avoid holding either mutex across the channel operation. In most real code, the second option is cleaner: prepare the message under a lock, drop the lock, send the message, then acquire any downstream resource.

An early-drop patch looks like this:

```rust
{
    let _left = left.lock();
    prepare_message();
}
tx.send(()).unwrap();
{
    let _right = right.lock();
    commit_result();
}
```

A lock-order patch is also valid:

```rust
let _left = left.lock();
let _right = right.lock();
```

The final repo should include both fixed variants as separate examples. It should also include a short explanation that zero-capacity channels are not dangerous by themselves. They are useful because they reveal ownership mistakes immediately.

Publication is blocked until maintainer notification and the required waiting period are complete. Because the repro names external crates, the public version should be careful and precise: the bug belongs to the demonstrated composition pattern unless additional upstream evidence changes that classification.

### Publication-Ready Analysis Addendum

The finished article should emphasize that the channel is not the villain. A zero-capacity or bounded channel is often the cleanest way to express backpressure. The dangerous part is using the rendezvous as a bridge while each side still owns a different mutex. Once the send and receive meet, both workers can proceed to their second critical section. If those second critical sections are acquired in opposite order, the channel has simply made the lock-order bug reachable at a precise moment. This distinction matters because the wrong remediation is to increase buffer size and hope the schedule disappears. A larger buffer may change how often the cycle appears, but it does not define a global resource order.

This case is useful for readers because it looks like common pipeline code. A producer owns one piece of state, sends a message, and then records a result. A consumer owns another piece of state, receives the message, and then updates the producer-facing cache. The two halves may live in separate modules, and each module can look locally correct. The producer has no direct call to the consumer's lock acquisition. The consumer has no direct call to the producer's first lock acquisition. The channel hides the coupling. Ki-DPOR exposes it because it treats the rendezvous as an event that changes enabled operations on both sides.

The final repro repository should therefore include a timeline table. Before the rendezvous, producer owns `left` and is waiting for a receiver. Consumer owns `right` and is ready to receive. During the rendezvous, the send completes and both sides move past the channel boundary. After the rendezvous, producer tries to acquire `right` and consumer tries to acquire `left`. That table turns a generic AB-BA explanation into the exact shape of the program. It also shows why a buffered channel can obscure the timeline: the producer may get past send before the consumer owns `right`, but a later schedule can still bring the same ownership pattern back.

The article should also discuss ownership transfer. In many systems, a channel is used because one side wants to give work to another side. If the message contains all data needed by the receiver, the sender can drop its lock before sending. If the receiver needs to mutate shared state after receiving, it should acquire resources in the same global order as every other worker. The unsafe middle ground is sending a message that acts like a permission slip while both sides still need shared mutable state. That is where the rendezvous stops being a clean ownership transfer and becomes a hidden synchronization point.

For the Bug DB, this pattern should be indexed under "channel-enabled lock-order violation." That wording separates it from plain mutex AB-BA and from plain channel deadlock. Plain mutex AB-BA can be found by scanning lock acquisition order inside two functions. Plain channel deadlock can be found by matching send and receive availability. This pattern needs both views. The cycle is a lock cycle, but the schedule that creates it is a channel schedule. A search system that only stores lock order will miss why the cycle is reachable; a search system that only stores channel operations will miss why the program cannot recover after the rendezvous.

The Sleep Set explanation deserves special care because it is a good teaching moment for partial-order reduction. The producer's work before the channel and the consumer's work before the channel may commute in several schedules. Ki-DPOR can prune those branches when they do not change the ownership state that matters. It cannot prune the rendezvous branch, because after that branch both second-lock attempts are enabled. In other words, the channel event is not independent of the future lock operations. It changes the set of possible lock operations. That is why the resulting trace is compact while still being complete for the bug.

The remediation section should include organizational guidance, not just code patches. Teams should document lock levels for state that crosses channel boundaries. A simple convention such as "pipeline state before result state" is often enough. Code review checklists should ask whether a channel operation happens while any mutex guard is live. Tracing should record when a task sends or receives while holding a guard in debug builds. These practices make the failure visible before a model checker is even run, and they give Laplace better labels when a deterministic trace is generated.

The final article should be precise about disclosure. If the repro uses `crossbeam-channel` and `parking_lot`, it must not imply either crate is defective unless a crate-specific invariant is violated. The composition can be dangerous while both libraries behave exactly as documented. That is a stronger educational claim than blaming a dependency: mature Rust code often fails at the boundary between correct primitives. The public case should frame Laplace as a tool for finding those boundary bugs before they become production outages.

The closing checklist should be short and actionable. Do not send or receive while holding a mutex unless the lock order after the channel is documented. Prefer messages that contain owned data over messages that require the receiver to re-enter sender-owned state. Keep a global ordering for all locks that can be touched on both sides of a channel. Test zero-capacity and low-capacity configurations even if production uses larger buffers, because they expose ownership mistakes earlier. Add a deterministic interleaving test for any pipeline where both sides own state before and after a rendezvous.

The final article should include a note on review boundaries. This bug often crosses ownership boundaries in the repository. The send side may be in a producer module, the receive side in a worker module, and the two locks in separate state structs. A reviewer assigned to one module can approve a local change without seeing the global cycle. The practical fix is to document channel protocols next to the channel type. A protocol comment should say which locks may be held while sending, which locks may be held while receiving, and which locks are forbidden across the rendezvous. If that comment is too hard to write, the design probably needs a smaller ownership boundary.

Operationally, the symptom may present as a queue that appears empty while workers are stuck, or as a producer blocked on send even though a consumer exists. Adding a buffer can appear to fix the incident because it lets one side run farther ahead. That response should be treated as mitigation only. The deterministic repro shows that the underlying cycle is between state locks after the channel boundary. A good postmortem should record the lock ownership state, not just channel capacity and queue depth.

The disclosure note should remain conservative. Neither `crossbeam-channel` nor `parking_lot` promises to prevent application-level lock-order cycles. If maintainers are contacted, the useful request is likely documentation feedback or confirmation that the minimal repro is a composition pattern. The public text should include that response when available and avoid language that makes the dependencies sound unsafe by default. The stronger claim is that correct primitives can still compose into incorrect protocols, and that protocols deserve deterministic tests.

The final page should also include an incident-review prompt. When a pipeline stalls, capture three facts before changing buffer sizes: which task owns each lock, which channel operation last completed, and which task became enabled by that channel operation. Those facts are enough to decide whether the channel is the cause or the hinge. In this case it is the hinge. The cause is that the post-rendezvous lock order is inconsistent. Recording the distinction prevents teams from shipping a capacity-only mitigation and calling it a fix.

For the final regression suite, keep one test with a zero-capacity channel even if production uses a buffer. A zero-capacity setup compresses the state space and makes the ownership transfer explicit. A second test can use the production buffer size to prove the patched protocol still works under realistic flow. Together they prevent two mistakes: dismissing the bug as an artificial rendezvous artifact, and accepting a buffered workaround that leaves the lock-order contract undefined.

The article should close by asking teams to name the owner of every value that crosses the channel. If ownership truly moves, no sender-side lock should be needed afterward. If ownership is shared, the protocol must say which side may re-enter shared state first. That one sentence can prevent the same bug from reappearing in a future refactor during routine maintenance.
