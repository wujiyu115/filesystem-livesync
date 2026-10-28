## Build the image:

From the root directory of the [vrtmrz/filesystem-livesync](https://github.com/vrtmrz/filesystem-livesync) repository run the following to build the image:

```
git submodule update --init --recursive
docker build -t filesystem-livesync -f docker/Dockerfile .
```

The `src/lib` submodule must be checked out, otherwise the build fails (the Dockerfile
checks for it and prints a hint).

The image is built in three stages (`deps` → `build` → `runtime`): the TypeScript bundle
is produced at build time and only production dependencies end up in the final image, so
no toolchain is shipped and nothing is compiled when the container starts.

### Options

| Build arg | Default | Notes |
| --- | --- | --- |
| `NODE_VERSION` | `22-bookworm-slim` | Any `node:<tag>` works; `22-alpine` is smaller (musl prebuild of `leveldown` is bundled) |

```
docker build -t filesystem-livesync:alpine -f docker/Dockerfile \
  --build-arg NODE_VERSION=22-alpine .
```

Approximate compressed/uncompressed footprint: ~250 MB on `bookworm-slim`, ~165 MB on
alpine (previously ~1.1 GB, since the image shipped full node_modules plus the esbuild /
typescript toolchain and re-ran the build on every start).

## Configure the image:

Assuming a folder at `/tmp/data` was going to store your config and vaults, write the following to `/tmp/data/config.json`:

```
{
    "config_1": {
        "server": {
            "uri": "http://example-uri/private1_vault",
            "auth": {
                "username": "couchdb_username",
                "password": "couchdb_password",
                "passphrase": "mypassphrase" // Remove if no passphrase is set for Vault
            },
            "initialScan": true 
        },
        "local": {
            "path": "/data/vault1",
            "initialScan": true 
        },
        "auto_reconnect": true,
        "sync_on_connect": true 
    }
}
```

## Run the image:

```
docker run -it --rm -v /tmp/data:/data filesystem-livesync
```

If you would like to be able to edit files from your host running Docker, it is recommended to set the `CHOKIDAR_USEPOLLING` environment variable to equal `1`:

```
docker run -it --rm -v /tmp/data:/data -e CHOKIDAR_USEPOLLING=1 filesystem-livesync
```

The container entrypoint is `node dist/index.js` (the bundle built into the image). If you
need esbuild / typescript at runtime (e.g. to re-run `npm run dev` inside the container),
build from the `build` stage instead: `docker build --target build -t filesystem-livesync:dev -f docker/Dockerfile .`
