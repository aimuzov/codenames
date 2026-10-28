# Changelog

## [1.7.0](https://github.com/aimuzov/codenames/compare/v1.6.0...v1.7.0) (2026-10-28)


### Features

* **relay:** invite players to an online room by link ([2f7fcde](https://github.com/aimuzov/codenames/commit/2f7fcde8c7ad2930089b224006c1f429a341173b))
* **relay:** invite players to an online room by link ([17062bc](https://github.com/aimuzov/codenames/commit/17062bccea7ec3050c0314d03c18942d8e5aa88e))
* **voice:** show who is speaking in the score chips ([3cf3185](https://github.com/aimuzov/codenames/commit/3cf318587b7730bdacf5111c2b8555cb99b40b6f))
* **voice:** show who is speaking in the score chips ([d3eef89](https://github.com/aimuzov/codenames/commit/d3eef89b655c5c6376d16260b5fcb49c1bc46ff6))


### Bug Fixes

* **relay:** add a copy button, accept pasted invite links, skip finished saves ([dd5dbb4](https://github.com/aimuzov/codenames/commit/dd5dbb402127d62b6ec239cb95a9103bf4e56ebb))
* **voice:** release the join lock when the audio context can't be created ([9d1d559](https://github.com/aimuzov/codenames/commit/9d1d55974353d652b39deb1f4b90379cfc38f609))
* **voice:** start the audio context within the tap and keep emoji initials whole ([66afbf6](https://github.com/aimuzov/codenames/commit/66afbf66d0dfbada7c3c072953d815f916e5dcc3))

## [1.6.0](https://github.com/aimuzov/codenames/compare/v1.5.3...v1.6.0) (2026-10-27)


### Features

* **voice:** add voice chat to online rooms ([9c7d2f2](https://github.com/aimuzov/codenames/commit/9c7d2f25aea715f1de6b75c1726f289e7c0bb052))
* **voice:** add voice chat to online rooms ([4245a2c](https://github.com/aimuzov/codenames/commit/4245a2c34650f3a2454b570db528a96e4bbc4178))


### Bug Fixes

* **relay:** handle errors on sockets refused by the connection limit ([5f441df](https://github.com/aimuzov/codenames/commit/5f441df14c5b3c8caf726251440b8b89d8e7d13f))
* **relay:** limit connections and TURN credentials per client IP ([c8bda33](https://github.com/aimuzov/codenames/commit/c8bda33eb23207f7b2c623de7203559fc0922c19))
* **relay:** limit connections and TURN credentials per client IP ([0e6a1aa](https://github.com/aimuzov/codenames/commit/0e6a1aa9dff3cd7f82143686be3aa605593badd6))
* **voice:** cap TURN allocations per credential ([5db18da](https://github.com/aimuzov/codenames/commit/5db18daa9dcd4229cd1e9fb3ed43034187e95a59))
* **voice:** harden TURN setup and release mic after an abandoned join ([4271e34](https://github.com/aimuzov/codenames/commit/4271e348b7248b910517c24bc8086c92b7d5dc0d))

## [1.5.3](https://github.com/aimuzov/codenames/compare/v1.5.2...v1.5.3) (2026-10-27)


### Bug Fixes

* **deps:** move to infra-site-kit v5.5.0 ([3847ac1](https://github.com/aimuzov/codenames/commit/3847ac1e75aab46738bd84bd5f393c43a024a65c))
* **deps:** move to infra-site-kit v5.8.1 ([209d85a](https://github.com/aimuzov/codenames/commit/209d85a9d16d943986c6e0d9ccdf21d3f0e45bfe))
* **deps:** move to infra-site-kit v5.8.1 ([d4f2cb6](https://github.com/aimuzov/codenames/commit/d4f2cb6cf5aa1bc4376269b010084ae6ce3869fc))

## [1.5.2](https://github.com/aimuzov/codenames/compare/v1.5.1...v1.5.2) (2026-10-24)


### Bug Fixes

* **deps:** move to infra-site-kit v3 under the personal aimuzov account ([27e1ed2](https://github.com/aimuzov/codenames/commit/27e1ed29e5e4508242aac2ad2e389266dce0a1da))
* **deps:** move to infra-site-kit v3 under the personal aimuzov account ([306239e](https://github.com/aimuzov/codenames/commit/306239e8265b08fcc6816b6dbeda9e1ab23d4370))

## [1.5.1](https://github.com/aimuzov-projects/codenames/compare/v1.5.0...v1.5.1) (2026-10-20)


### Bug Fixes

* **deps:** move to infra-site-kit v2 with base.css ([1e5db40](https://github.com/aimuzov-projects/codenames/commit/1e5db40d951ab21eeef0211f1a094ecac6a9d932))
* **deps:** move to infra-site-kit v2 with base.css ([3933998](https://github.com/aimuzov-projects/codenames/commit/3933998442b8d416b9d8cf6cbf28d1fcd5af9e61))

## [1.5.0](https://github.com/aimuzov-projects/codenames/compare/v1.4.0...v1.5.0) (2026-10-20)


### Features

* reserve the scrollbar gutter on every page ([cd0a27d](https://github.com/aimuzov-projects/codenames/commit/cd0a27d5f77e3711f55bb84b72bac1539aff90fc))
* reserve the scrollbar gutter on every page ([5bb408f](https://github.com/aimuzov-projects/codenames/commit/5bb408f4f790c583ae738559b01ae245d1e6fbd0))

## [1.4.0](https://github.com/aimuzov-projects/codenames/compare/v1.3.0...v1.4.0) (2026-10-18)


### Features

* move the 404 to the shared not-found page ([fcb0293](https://github.com/aimuzov-projects/codenames/commit/fcb0293e903d6b989a0ff64334ed95868e2bdfd1))
* move the 404 to the shared not-found page ([e807292](https://github.com/aimuzov-projects/codenames/commit/e8072921698e9ed5b7935d9d79f4b40788a7059e))


### Bug Fixes

* **ci:** don't deploy a cancelled run ([#26](https://github.com/aimuzov-projects/codenames/issues/26)) ([6dc9d76](https://github.com/aimuzov-projects/codenames/commit/6dc9d76b90eaf7733b0cdd08bc920c159ea54c70))
* **ci:** run checks once per PR push ([#28](https://github.com/aimuzov-projects/codenames/issues/28)) ([3ce4b76](https://github.com/aimuzov-projects/codenames/commit/3ce4b7606ba92b03ba2ed2e2b82e424365858df8))

## [1.3.0](https://github.com/aimuzov-projects/codenames/compare/v1.2.0...v1.3.0) (2026-10-14)


### Features

* center the author credit ([8be77b3](https://github.com/aimuzov-projects/codenames/commit/8be77b3efa7fa1dd234736423dbfb5a6f2393bdd))
* peek at each theme from its button in settings ([38bd2ab](https://github.com/aimuzov-projects/codenames/commit/38bd2abf765bfc2b5b579a87d7503f69abab607d))
* take the author credit from infra-site-kit ([e1b0653](https://github.com/aimuzov-projects/codenames/commit/e1b065334fca98e1398acd5f5fb2f327df15503a))


### Bug Fixes

* load the early theme script from a file covered by the CSP ([f29ed70](https://github.com/aimuzov-projects/codenames/commit/f29ed70edce32d8039d7140390897a820919cefa))

## [1.2.0](https://github.com/aimuzov-projects/codenames/compare/v1.1.0...v1.2.0) (2026-10-13)

### Features

* add an online room mode over a WS relay ([afd0796](https://github.com/aimuzov-projects/codenames/commit/afd079670d3f572482ec508efa0ac9c119e9dc31))
* keep players in the game across connection drops ([97c9306](https://github.com/aimuzov-projects/codenames/commit/97c930681bbd9ea5d45bcbfc1b450432fdc6a646))
* port the game screens to Svelte ([b280eff](https://github.com/aimuzov-projects/codenames/commit/b280eff1275ff5e868b8caa149699bb16073bf10))
* restore a network game after the app restarts ([663b76c](https://github.com/aimuzov-projects/codenames/commit/663b76c2bb066420fcd484ef003447b400639c20))

### Bug Fixes

* serve the PWA manifest with its MIME type ([29ce3bc](https://github.com/aimuzov-projects/codenames/commit/29ce3bca28ced6c1daf67c5de5afeefe1b2e5a92))
* silence base-ui nativeButton warning on alert dialog backdrop ([4831d5a](https://github.com/aimuzov-projects/codenames/commit/4831d5a80edbccf52750555b32c7869bcde59292))
* **ui:** keep the switch thumb off the right edge ([b7a3aab](https://github.com/aimuzov-projects/codenames/commit/b7a3aab6564f06eb36c14efcceade931313e6c3e))

## [1.1.0](https://github.com/aimuzov/codenames/compare/v1.0.0...v1.1.0) (2026-06-19)

### Features

- add user-facing changelog screen ([986b8a6](https://github.com/aimuzov/codenames/commit/986b8a66db4e7cd11d2e423c64ab1ef529143753))

### Bug Fixes

- keep guests in the game when the host starts a new round ([334e1a0](https://github.com/aimuzov/codenames/commit/334e1a0496913a8e268702d8cd6fc138a607fe27))

## 1.0.0 (2026-06-18)
