#!/bin/bash
# usage: sheet.sh out.png w img1..img8   (4x2 grid)
out=$1; w=$2; shift 2
args=(); f=""
i=0; for img in "$@"; do args+=(-i "$img"); f+="[$i]scale=$w:-1[s$i];"; i=$((i+1)); done
ffmpeg -v error -y "${args[@]}" -filter_complex "${f}[s0][s1][s2][s3][s4][s5][s6][s7]xstack=inputs=8:layout=0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0" "$out"
