



bootstrap.js:
	node make_bootstrap.js


.PHONY: bootstrap
bootstrap: bootstrap.js


clean:
	rm -f bootstrap.js


