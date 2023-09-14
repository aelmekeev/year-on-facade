build:
	./utils/build.sh

t-init:
	aws-vault exec year-on-facade -- terraform -chdir=iaac init -backend-config=backend.tfvars

t-plan:
	aws-vault exec year-on-facade -- terraform -chdir=iaac plan

t-apply:
	aws-vault exec year-on-facade -- terraform -chdir=iaac apply

validate:
	./utils/validate.sh

.PHONY: photos
photos:
	./photos/optimise.sh

photos-update:
	./photos/optimise.sh update

# TODO: read name of the bucket from iaac/backend.tfvars
photos-upload:
	aws-vault exec year-on-facade -- aws s3 sync ./photos/upload s3://year-on-facade

show-stats:
	python ./utils/show-stats.py $(country) $(city)