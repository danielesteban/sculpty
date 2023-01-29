#!/bin/sh
cd "${0%/*}"
WASI_SDK_PATH=../../../wasi-sdk-17.0
${WASI_SDK_PATH}/bin/clang \
--sysroot=${WASI_SDK_PATH}/share/wasi-sysroot \
-nostartfiles \
-flto \
-Ofast \
-Wl,--no-entry \
-Wl,--lto-O3 \
-Wl,--import-memory \
-Wl,--export=malloc \
-Wl,--export=run \
-o ./${1}.wasm ${1}.c
