



bootstrap.js: scripts/bootstrap.js
	node $<



.PHONY: bootstrap
bootstrap: bootstrap.js



clean:
	rm -f bootstrap.js


