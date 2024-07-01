FROM ghcr.io/sebadob/rauthy:0.22.0 AS rauthy
FROM scratch
COPY --from=rauthy /app/rauthy /
COPY --from=rauthy /app/rauthy.cfg /
CMD "/idontexist"
