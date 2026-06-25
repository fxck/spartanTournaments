<!-- #ZEROPS_EXTRACT_START:intro# -->
Run SpartanTournaments on a budget: a single-node Postgres with the `app` runtime
on shared CPU, autoscaling 1→2. Ideal for a single event, evaluation or
low-traffic use. There's no redundancy — a container restart briefly drops
traffic. The database schema migrates automatically on first boot and the session
secret is generated on import, so it's ready as soon as it starts.
<!-- #ZEROPS_EXTRACT_END:intro# -->
