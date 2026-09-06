# GitHub issue body refresh

Date: 2026-09-06 KST

User explicitly requested refreshing the existing issue bodies after the post-PR145 closure audit.
All13 open issues were updated, without closing/reopening, retitling, creating issues, or changing
application code or deployment state. Only the body field was submitted.

## Content changes

- Current status, shipped evidence, outstanding work and remaining acceptance conditions now lead
  each body. Original reports, measurements, source links and attachments remain in a collapsed
  historical section. Old checkboxes use plain symbols there so they do not act as current tasks.
- Issue130 reflects D-045 and its later comment: wastedHandTravel and monotone reposition metrics
  are disqualified; current recorded valid metrics are3/1 and10/155; arpeggio improvement awaits
  a human reference. Earlier43/167 and13/167 figures are historical, not current optimization goals.
- Issue126 separates delivered cost-model work from pending context/voice delivery and the notation
  contract shared with125. Deleted CAGED machinery is no longer proposed as current work.
- Issues125/127 reflect the accepted D-040 policy and re-registration decision, with automatic
  MusicXML retention/lifecycle still undecided. Manual corpus is distinguished from service retention.
- Issue47 separates the delivered UI masking from pending service classification/sanitization.
- Issues121/73/110 distinguish real deployment checks from continuous monitoring and callback
  behavior/allowlisting still to be implemented.
- Issues134/44 retain their original Clair de Lune/Bach completion scope; the Love recovery does not
  certify those other sources. Issue46 identifies old DPI observations as historical and requires
  checking the current engine before choosing a correction. UI124 and sample-level61 scopes remain.
- Existing priorities and unresolved decisions were preserved. No new implementation policy was
  accepted by this documentation action. Existing comments were read and left untouched.

## Verification and preservation

Before each write, the live body/title/open state matched the saved original. No concurrent-edit
conflict occurred. Each body was read back immediately and matched the submitted text exactly;
all13 titles remained identical and all13 states remained OPEN. Every original URL was checked
for preservation in the draft. No application tests were run for these text-only edits.

Original bodies/comments, rendered Markdown bodies and per-write results are retained inside this
project at local-test-data/results/wedge-deploy-2026-09-06/ (Git-excluded). GitHub bodies also retain
historical source text. This canonical record captures the decisions, scope and exact body hashes
so another session need not rely on private agent memory.

| Issue | Original body SHA256 | Updated body SHA256 |
| --- | --- | --- |
| [#44](https://github.com/landfill/ClairKeys/issues/44) | `2ea926e58579de1626064721a32faae53a1a6d613853c8934b7deb6e7ba55d6c` | `d9a264432ac164bc75248d4db2426db87cc42192078009df2432f05b038e1595` |
| [#46](https://github.com/landfill/ClairKeys/issues/46) | `3abcecd0d6c2933b115412303b8bb1c6ce8f829c44dcddc9ec1b3c642c6783fa` | `93e54946eb64264cc7fb3eb0e8cd76ce6c8a857974c50682e4171ba051920b50` |
| [#47](https://github.com/landfill/ClairKeys/issues/47) | `b55a93d0b074788afe04155125d50074c716f38581205c77e93a874cc874fc0c` | `37b0ac6392372d5e2b8c3814453c2bf273a5f07f2cca959ecb5f37f9950de209` |
| [#61](https://github.com/landfill/ClairKeys/issues/61) | `984737cc80319bc769895e635bf9ddaba30515f991fba34778d2b22853be880c` | `c6aaccb7a93ccdb6201f6cb78516c0c64dda78dce3aeb682432105256086a533` |
| [#73](https://github.com/landfill/ClairKeys/issues/73) | `f5b1a3184eb4c59388395370eb4c5c5ed71c44ed7f1d2b6a08d09fabba95a39e` | `55b65e63cd357ccbc509d8491f2d484681b74381d2e83873f300f5d3f61a1129` |
| [#110](https://github.com/landfill/ClairKeys/issues/110) | `d11f2271c6f1c2d99461559cc524a8496cd92c3e5af9d598e13fd8479293a508` | `afd1a1d0cbdc6e0965eb1978cdd71105f049a2b1695d1b00ed280846e07484db` |
| [#121](https://github.com/landfill/ClairKeys/issues/121) | `e09da3ec376819f728c5c21d07f9be51223b724c646f349652fe78b4c7e20b8c` | `d06462612354c9453d91943e5c022a22a58585df82084063437bc980b7f4f6db` |
| [#124](https://github.com/landfill/ClairKeys/issues/124) | `fccb0a881fea37f0def02994dd27199ad1f063e19b6cf7d845db050eefa1b275` | `f099d32616ef29c983f73e6019d0dfcf9d806593d82049d04805b94c45bd1c15` |
| [#125](https://github.com/landfill/ClairKeys/issues/125) | `241a14f60ed67d556746ab4d0d3c15b9fa1b9925b69d4893f40304b221d6fcf4` | `fee23f574961e004207858ecb1f2eb6b19bc207369e56d3201f06c80b8b9c3ec` |
| [#126](https://github.com/landfill/ClairKeys/issues/126) | `f987d2a9eccbf01b011d67ca87c86930ac75d8144c3e9ec407e7b4a7ab042795` | `9b2ba662f6119b2b3dc896f68e057d726e15ee5dea22a043fb10eafbed9f1565` |
| [#127](https://github.com/landfill/ClairKeys/issues/127) | `a8648a418678e73257854fb032ee155c9b699e7416ca6fd19b2596bd0295173b` | `35b5b1d4b838884d78060aed3fd2fe2126928e74e503710ff0b5d8703d154325` |
| [#130](https://github.com/landfill/ClairKeys/issues/130) | `b761af84f5e4600cb2849f2eb0edef09d1028eeef2ef760ec654f5917793f213` | `93e4267376cce705c3a995d1515606122ae32f46fa7d56627e16fede3a970552` |
| [#134](https://github.com/landfill/ClairKeys/issues/134) | `977cf30aaeb0ba6b0612fb0f33e2a2220d081c405715853357d8ed023eb86fce` | `d8a035206073493f0b474f59cd771cd5eadf838eae8987ad160561aebb2517fe` |
