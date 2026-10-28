---
layout: pixel
title: about
permalink: /
---

<section aria-labelledby="about">
  <img class="portrait" src="{{ '/assets/img/lcx-lowres.png' | relative_url }}" alt="Chengxing Lin" width="108" height="144">
  <h2 id="about">About</h2>
  <p>I am a master's student in Computer Technology at the <a href="https://www.uestc.edu.cn">University of Electronic Science and Technology of China (UESTC)</a>, advised by Prof. Wen Li. I received my bachelor's degree in Computer Science and Technology from <a href="https://www.gdut.edu.cn">Guangdong University of Technology (GDUT)</a>.</p>
  <p>I work on <strong>embodied AI and 3D vision</strong>, with a focus on vision-and-language navigation, spatial understanding, test-time training, and point cloud representation learning.</p>
</section>

<section id="research" aria-labelledby="research-heading">
  <h2 id="research-heading">Research Interests</h2>
  <ul>
    <li><strong>Navigation &amp; embodied AI:</strong> vision-and-language navigation, spatial understanding, and adaptive memory.</li>
    <li><strong>Learning &amp; adaptation:</strong> test-time training, in-context learning, and self-supervised learning.</li>
    <li><strong>3D vision:</strong> point cloud understanding and efficient representation learning.</li>
  </ul>
</section>

<section aria-label="Research papers">
  {% include research-list.liquid %}
</section>

<section id="experience" aria-labelledby="experience-heading">
  <h2 id="experience-heading">Experience</h2>
  <article class="entry">
    <h3>Agibot / VLN Algorithm Intern</h3>
    <p class="date">2026.04 &ndash; Present</p>
    <p>Agibot Nav core contributor. Built the SFT training framework for discrete-action and pixel-goal navigation, and led model training and iteration. Designed simulation and real-world data collection workflows; explored DAgger, spatial guidance, adaptive memory, and reinforcement learning for navigation.</p>
    <p>Developed a real-robot, language-directed object navigation demo integrating target localization, continuous tracking, and closed-loop visual servoing.</p>
  </article>
  <article class="entry">
    <h3>Pony.ai / Perception Algorithm Intern</h3>
    <p class="date">2024.10 &ndash; 2025.04</p>
    <p>Worked on lightweight visual model pretraining and knowledge distillation for autonomous driving. Built a ten-million-scale small-object dataset and an offline feature extraction and distillation pipeline, transferring CLIP and Qwen2-VL visual representations to compact models for pedestrian and vehicle classification.</p>
  </article>
</section>

<section id="education" aria-labelledby="education-heading">
  <h2 id="education-heading">Education</h2>
  <ul>
    <li><strong>UESTC</strong> / M.Eng. in Computer Technology<br><span class="date">2025.09 &ndash; Present</span> / National Scholarship</li>
    <li><strong>GDUT</strong> / B.Eng. in Computer Science and Technology<br><span class="date">2021.09 &ndash; 2025.06</span></li>
  </ul>
</section>
