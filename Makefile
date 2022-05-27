build:
	./utils/build.sh

validate:
	./utils/validate.sh

.PHONY: photos
photos:
	./photos/optimise.sh

photos-update:
	./photos/optimise.sh update
