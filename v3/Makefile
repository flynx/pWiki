


BOOTSTRAP_FILES := \
	$(wildcard bootstrap/*) \
	$(wildcard bootstrap/*/*) \
	README.md

LOCAL_MODULES := \
	node_modules/ig-doc/doc.js \
	node_modules/ig-stoppable/stoppable.js \
	node_modules/ig-object/object.js \
	node_modules/ig-actions/actions.js \
	node_modules/ig-features/features.js

EXT_MODULES := \
	$(wildcard node_modules/pouchdb/dist/*) \
	$(wildcard node_modules/jszip/dist/*) \
	$(wildcard node_modules/idb-keyval/dist/*.js) \
	$(wildcard node_modules/showdown/dist/*)

POUCH_DB := \
	$(wildcard node_modules/pouchdb/dist/*)



lib/types: node_modules
	mkdir -p $@
	cp node_modules/ig-types/*js $@


bootstrap.js: scripts/bootstrap.js $(BOOTSTRAP_FILES)
	node $<


.PHONY: bootstrap
bootstrap: bootstrap.js


node_modules:
	npm install


dev: node_modules lib/types $(EXT_MODULES) $(LOCAL_MODULES) bootstrap
	cp $(LOCAL_MODULES) lib/
	cp $(EXT_MODULES) ext-lib/


clean:
	rm -f bootstrap.js


