




bootstrap.js: scripts/bootstrap.js
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


