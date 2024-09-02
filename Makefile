.PHONY: build t-init t-plan t-apply photos-upload show-stats

build:
	python ./utils/build.py
	python ./utils/validate.py

t-init:
	aws-vault exec year-on-facade -- terraform -chdir=iaac init -backend-config=../config.properties

t-plan:
	aws-vault exec year-on-facade -- terraform -chdir=iaac plan

t-apply:
	aws-vault exec year-on-facade -- terraform -chdir=iaac apply
	terraform-docs --config iaac/.terraform-docs-aws.yml iaac/

photos-upload:
	./photos/find_missing.sh
	./photos/upload.sh

show-stats:
	python ./utils/show-stats.py $(country) $(city)