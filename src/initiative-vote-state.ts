export function voteActionState(hasVoted: boolean) {
  return hasVoted
    ? { showActions: false, message: 'Głos już oddany na tę inicjatywę' }
    : { showActions: true, message: null };
}
