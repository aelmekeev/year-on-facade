build:
	./utils/build.sh

validate:
	./utils/validate.sh

.PHONY: photos
photos:
	./photos/optimise.sh

photos-update:
	./photos/optimise.sh update

photos-upload:
	aws-vault exec year-on-facade -- aws s3 sync ./photos/upload s3://year-on-facade