<!-- #ZEROPS_EXTRACT_START:intro# -->
The development topology for SpartanTournaments: a dev + stage pair over a
single-node Postgres, both built from git. `appdev` builds with the `dev` setup
as a ready-to-edit working dev environment — an AI agent (or you) mounts the
filesystem, edits, and iterates on top — while `appstage` builds with the `prod`
setup as a live reference. Non-HA and lightweight.
<!-- #ZEROPS_EXTRACT_END:intro# -->
