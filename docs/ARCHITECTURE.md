# POC-1 Architecture

The intended POC-1 boundary is:

```text
immutable Power-to-Sell CSV
  -> ATN normalization
  -> official Kern ArcGIS parcel query
  -> exact identity verification
  -> normalized CSV/JSONL plus provenance
  -> automated and manual validation
```

Implementation stopped at the first live dependency. The official MapServer rejected unauthenticated metadata inspection with ArcGIS error 499 (`Token Required`). Per the specification, no resolver or downstream pipeline was built after that gate failed.
