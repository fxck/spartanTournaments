<!-- #ZEROPS_EXTRACT_START:intro# -->
The development topology for SpartanTournaments: a dev + stage pair over a
single-node Postgres. The dev container (`appdev`) starts empty for an AI agent
(or you) to adopt and drive — edit on the mounted filesystem and deploy with the
`dev` setup — while `appstage` builds from git with the `prod` setup as a live
reference. Non-HA and lightweight.
<!-- #ZEROPS_EXTRACT_END:intro# -->
