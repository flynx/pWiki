


BOOTSTRAP_FILES := \
	$(wildcard bootstrap/*) \
	$(wildcard bootstrap/*/*) \
	README.md

LOCAL_MODULES := \
	node_modules/ig-object/object.js \
	node_modules/ig-actions/actions.js \
	node_modules/ig-features/features.js



bootstrap.js: scripts/bootstrap.js $(BOOTSTRAP_FILES)
	node $<



.PHONY: bootstrap
bootstrap: bootstrap.js


node_modules:
	npm install


dev: node_modules $(LOCAL_MODULES) bootstrap
	cp $(LOCAL_MODULES) lib/


clean:
	rm -f bootstrap.js


