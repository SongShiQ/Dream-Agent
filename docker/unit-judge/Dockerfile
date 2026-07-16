FROM rust:1.79-slim

RUN useradd -m -u 1000 judge
COPY unit-judge.mjs /usr/local/bin/unit-judge
RUN chmod +x /usr/local/bin/unit-judge

USER judge
WORKDIR /workspace
ENTRYPOINT ["unit-judge"]
