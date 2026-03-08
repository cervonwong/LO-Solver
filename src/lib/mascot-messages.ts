import type { MascotState } from '@/contexts/mascot-context';

export interface MessageSegment {
  text: string;
  accent?: boolean;
}

/**
 * 5 message variants per MascotState (25 total).
 * Each variant is an array of MessageSegment with optional accent spans.
 */
const MASCOT_MESSAGES: Record<MascotState, MessageSegment[][]> = {
  idle: [
    [
      { text: "I'm Lex, the Linguistics Olympiad Problem solving duck! " },
      { text: 'Copy and paste', accent: true },
      { text: ' a LO Problem below or try one of my examples!' },
    ],
    [
      { text: 'Quack quack! Got a linguistics puzzle? ' },
      { text: 'Paste it below', accent: true },
      { text: " and let's get cracking!" },
    ],
    [
      { text: "This duck's got brains! " },
      { text: 'Drop a problem', accent: true },
      { text: ' in the box and watch me work.' },
    ],
    [
      { text: 'Waddle you waiting for? ' },
      { text: 'Paste a problem', accent: true },
      { text: ' below or pick an example!' },
    ],
    [
      { text: 'Feathers primed, brain loaded. ' },
      { text: 'Give me a puzzle', accent: true },
      { text: ' to sink my beak into!' },
    ],
  ],

  ready: [
    [
      { text: "Ooh, that's a juicy one! " },
      { text: 'Scroll down', accent: true },
      { text: " and hit '" },
      { text: 'SOLVE', accent: true },
      { text: "' — I'll get quacking!" },
    ],
    [
      { text: "Now we're talking! " },
      { text: 'Scroll down', accent: true },
      { text: " and smash that '" },
      { text: 'SOLVE', accent: true },
      { text: "' button!" },
    ],
    [
      { text: 'Ooh I love this kind of puzzle! ' },
      { text: 'Scroll down', accent: true },
      { text: " to click '" },
      { text: 'SOLVE', accent: true },
      { text: "' and watch me fly!" },
    ],
    [
      { text: 'My duck senses are tingling... ' },
      { text: 'Scroll down', accent: true },
      { text: " and press '" },
      { text: 'SOLVE', accent: true },
      { text: "' — let's do this!" },
    ],
    [
      { text: 'A worthy challenge! ' },
      { text: 'Scroll down', accent: true },
      { text: " to click '" },
      { text: 'SOLVE', accent: true },
      { text: "' — I'll give it my best quack!" },
    ],
  ],

  solving: [
    [{ text: 'Quack-ulating... my finest duck brains are on it!' }],
    [{ text: 'Analyzing patterns... this is what I was hatched for!' }],
    [{ text: 'Hmm, let me ruffle through my linguistic feathers...' }],
    [{ text: 'Cross-referencing quack-tionaries... almost there!' }],
    [{ text: 'Duck-oding the patterns... the pieces are falling into place!' }],
  ],

  solved: [
    [{ text: "Duck yeah! The answer's all wrapped up. How'd I do?" }],
    [{ text: 'Nailed it! Well, I think so. Take a gander at my work!' }],
    [{ text: "And that's how the duck does it! Check out the answers below!" }],
    [{ text: "Ta-da! Another puzzle cracked. I'm one talented fowl!" }],
    [{ text: 'Quack of dawn to finish line! Here are my answers!' }],
  ],

  error: [
    [
      {
        text: 'Oh no, I ruffled my feathers on that one... Try again or paste a different problem!',
      },
    ],
    [
      { text: "Well, that didn't fly... Give it another " },
      { text: 'try', accent: true },
      { text: ' or swap the problem!' },
    ],
    [
      { text: 'Ducking disaster! Something went wrong. ' },
      { text: "Let's ", accent: false },
      { text: 'try again', accent: true },
      { text: '!' },
    ],
    [
      { text: 'My wings got tangled... Hit ' },
      { text: 'try again', accent: true },
      { text: " and I'll give it another go!" },
    ],
    [
      { text: 'Fowl play! Something broke. ' },
      { text: 'Paste a new problem', accent: true },
      { text: ' or retry!' },
    ],
  ],

  aborted: [
    [
      { text: 'Quack! No worries, we can ' },
      { text: 'try again', accent: true },
      { text: " whenever you're ready!" },
    ],
    [
      { text: 'Stopped mid-waddle! ' },
      { text: 'Paste a new problem', accent: true },
      { text: ' or hit ' },
      { text: 'SOLVE', accent: true },
      { text: ' to restart.' },
    ],
    [
      { text: "Mission a-duck-ed! Ready for another go when you are." },
    ],
    [
      { text: 'Alright, pulling the brakes! ' },
      { text: 'Try another problem', accent: true },
      { text: ' or re-run this one.' },
    ],
    [
      { text: 'Wings folded! Want to ' },
      { text: 'give it another go', accent: true },
      { text: ' or try something new?' },
    ],
  ],
};

/** Pick a random message variant for the given state. */
export function getRandomMessage(state: MascotState): MessageSegment[] {
  const variants = MASCOT_MESSAGES[state];
  const index = Math.floor(Math.random() * variants.length);
  return variants[index] ?? variants[0]!;
}
