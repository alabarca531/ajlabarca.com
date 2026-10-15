---
title: "Detection & Tracking for mWidar Imaging"
short: "mWidar tracking"
status: current
when: "2025 – present"
partner: "Wavesens"
tags: [Computer vision, Data association, Particle filters]
summary: "Detecting and tracking moving targets in continuous-capture microwave imagery from mWidar, a low-cost radar that images a whole scene at once at thousands of frames per second."
weight: 10
---

**mWidar** (microwave detection and ranging) replaces expensive radar hardware with simple
antennas and heavy signal processing. Instead of sweeping one direction at a time, it images an
entire scene at once, at thousands of frames per second. That makes it attractive for
counter-UAS work and, eventually, for tracking hypersonic vehicles.

That speed and low cost come with harder perception problems. Working with high-fidelity mWidar
simulations, I build the full detector-tracker pipeline:

- **Detection.** Computer vision and deep learning methods that find targets in microwave images, even when targets are occluded or interfere with one another.
- **Data association.** Keeping identities consistent across frames when detections are missing, cluttered, or ambiguous.
- **Estimation.** Predicting target motion with Kalman and particle filters, and quantifying how confident the tracker should be.

The broader goal is to move sensing from hardware-intensive to software-intensive systems, so
that capable tracking becomes cheap enough to deploy widely.
