build:
	./utils/build.sh

t-init:
	aws-vault exec year-on-facade -- terraform -chdir=iaac init -backend-config=../config.properties

t-plan:
	aws-vault exec year-on-facade -- terraform -chdir=iaac plan

t-apply:
	aws-vault exec year-on-facade -- terraform -chdir=iaac apply

validate:
	./utils/validate.sh

photos-upload:
	./photos/find_missing.sh
	./photos/upload.sh

show-stats:
	python ./utils/show-stats.py $(country) $(city)