

BOOTSTRAP_FILES := \
	$(wildcard bootstrap/*) \
	$(wildcard bootstrap/*/*) \
	README.md




bootstrap.js: scripts/bootstrap.js $(BOOTSTRAP_FILES)
	node $<



.PHONY: bootstrap
bootstrap: bootstrap.js


node_modules:
	npm install


dev: node_modules
	cp $</ig-object/object.js lib/
	cp $</ig-actions/actions.js lib/
	cp $</ig-features/features.js lib/



clean:
	rm -f bootstrap.js


