# photo-tools

Photography tools that run on your own machine. Like `home-server/`, this is
version-controlled here for shared conventions and history but is **not** part
of the `apps/` deploy pipeline:

- Nothing under `photo-tools/` is built into a Docker image, listed in
  `deploy.yml`, or routed by Traefik.
- Each tool is a local program you install and run yourself. Its README covers
  how to do that.

## Tools

| Directory                            | What                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| [`recipe_dev`](recipe_dev/README.md) | Apply Recipe Lab film recipes to Sony RAW files: live-preview editor, JPEG export |
