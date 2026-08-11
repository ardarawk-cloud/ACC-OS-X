Fix persistent TechVerse QC halts where the Research stage passes grounding with at least two validated URLs, but downstream mobile context compaction leaves only one URL visible to deterministic QC.

RC3 anchors the first two already-validated Research URLs inside SOURCE_NOTES, which the existing BUILD250 client bridge preserves early during compactResearch. RC2 remains as fallback; the two-source QC requirement is unchanged.

Frozen/untouched: worker.js, Meta Publish Connector, Meta tokens/Page IDs/secrets, publishing payload/path, PWA build number.
