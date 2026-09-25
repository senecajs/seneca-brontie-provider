# Patches to apply

These patches hold generated workflow files that could not be pushed without
GitHub's `workflow` scope. Apply them from a checkout whose credentials have
it, on this branch or on `main`, and remove this directory in the same commit:

```sh
git am .sdk/patches/0001-Add-the-generated-build-and-publish-workflows.patch
git rm -rq .sdk/patches && git commit -q --amend --no-edit
git push
```

Each patch is exactly what `npm run generate` writes at the commit that added
it, so regenerating after applying it changes nothing.
