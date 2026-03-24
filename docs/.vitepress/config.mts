// docs/.vitepress/config.mts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Laplace Docs",
  description: "The Sovereign Architecture for High-Performance AI Agents",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Docs', link: '/concepts/architecture' }
    ],

    sidebar: [
      {
        text: 'Getting started',
        collapsed: false, // 처음 접속 시 열려있음
        items: [
          { text: 'Laplace 소개', link: '/getting-started/introduction' },
          { text: '빠른 시작 (Quickstart)', link: '/tutorials/quickstart' },
        ]
      },
      {
        text: 'Concepts',
        collapsed: false, // 처음 접속 시 열려있음
        items: [
          { text: '개요 (Overview)', link: '/concepts/overview' },
          { text: 'Sovereign Architecture', link: '/concepts/architecture' },
          { text: 'Axiom (Verification)', link: '/concepts/axiom' },
          { text: 'Kraken (Chaos Engine)', link: '/concepts/kraken' },
          { text: 'Probe (Observability)', link: '/concepts/probe' },
        ]
      },
      {
        text: 'Tasks',
        collapsed: true, // K8s처럼 닫아두기
        items: [
          { text: 'laplace.toml 설정하기', link: '/tasks/configuration' },
          { text: '무중단 핫리로딩 (RCU)', link: '/tasks/hot-reloading' },
          { text: '네트워크 결함 주입하기', link: '/tasks/fault-injection' },
        ]
      },
      {
        text: 'Tutorials',
        collapsed: true, // K8s처럼 닫아두기
        items: [
          { text: 'Heisenbug 사냥하기', link: '/tutorials/hunting-heisenbugs' },
          { text: '10,000 에이전트 부하 테스트', link: '/tutorials/mass-simulation' },
        ]
      },
      {
        text: 'Reference',
        collapsed: true, // K8s처럼 닫아두기
        items: [
          { text: 'CLI 명령어 사전', link: '/reference/cli' },
          { text: '설정 명세 (laplace.toml)', link: '/reference/config-spec' },
          { text: 'C-ABI 인터페이스', link: '/reference/abi-spec' },
        ]
      },
      {
        text: 'Contribute',
        collapsed: true,
        items: [
          { text: '기여 가이드', link: '/contribute/guidelines' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Laplace-Labs-inc/laplace-dev' }
    ]
  }
})