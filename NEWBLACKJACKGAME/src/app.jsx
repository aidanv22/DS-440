import React, { useState, useEffect } from 'react';

const BlackjackGame = () => {
  // ==================== STATE MANAGEMENT ====================
  const [deck, setDeck] = useState([]);
  const [dealtCards, setDealtCards] = useState([]); // Track all dealt cards for card counting
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [gameState, setGameState] = useState('betting');
  const [message, setMessage] = useState('Place your bet to start');
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [chips, setChips] = useState(10000);
  const [bet, setBet] = useState(0);

  // ==================== CARD DEFINITIONS ====================
  const suits = ['♥', '♦', '♣', '♠'];
  const suitNames = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  // ==================== UTILITY FUNCTIONS ====================
  const getSuitColor = (suit) => {
    return suit === '♥' || suit === '♦' ? '#dc2626' : '#000000';
  };

  // Create a 6-deck shoe (312 cards total)
  const createDeck = () => {
    const newDeck = [];
    // Create 6 decks
    for (let deckNum = 0; deckNum < 6; deckNum++) {
      for (let i = 0; i < suitNames.length; i++) {
        for (let value of values) {
          newDeck.push({ suit: suits[i], suitName: suitNames[i], value });
        }
      }
    }
    return shuffleDeck(newDeck);
  };

  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Calculate hand score with Ace handling
  const calculateScore = (hand) => {
    let score = 0;
    let aces = 0;

    for (let card of hand) {
      if (card.value === 'A') {
        aces += 1;
        score += 11;
      } else if (['K', 'Q', 'J'].includes(card.value)) {
        score += 10;
      } else {
        score += parseInt(card.value);
      }
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }

    return score;
  };

  // Deal a card from the deck and track it
  const dealCard = (currentDeck, currentDealtCards) => {
    const newDeck = [...currentDeck];
    const card = newDeck.pop();
    const newDealtCards = [...currentDealtCards, card];
    return { card, newDeck, newDealtCards };
  };

  // ==================== CARD COUNTING HELPER ====================
  const getCardCount = () => {
    const cardCounts = {};
    
    // Initialize all possible cards
    for (let suit of suits) {
      for (let value of values) {
        const key = `${value}${suit}`;
        cardCounts[key] = { dealt: 0, remaining: 6 }; // 6 of each card in a 6-deck shoe
      }
    }
    
    // Count dealt cards
    for (let card of dealtCards) {
      const key = `${card.value}${card.suit}`;
      if (cardCounts[key]) {
        cardCounts[key].dealt += 1;
        cardCounts[key].remaining = 6 - cardCounts[key].dealt;
      }
    }
    
    return cardCounts;
  };

  // ==================== GAME ACTIONS ====================
  const placeBet = (amount) => {
    if (amount > chips) {
      setMessage('Not enough chips!');
      return;
    }
    setBet(amount);
    setChips(chips - amount);
    startGame(amount);
  };

  const startGame = (betAmount) => {
    let newDeck = [...deck];
    let newDealtCards = [...dealtCards];
    
    // Check if we need to reshuffle (less than 15 cards remaining)
    if (newDeck.length < 15) {
      newDeck = createDeck();
      newDealtCards = [];
      setMessage('Shuffling new 6-deck shoe...');
      setTimeout(() => setMessage(''), 1500);
    }
    
    // Deal initial cards
    const deal1 = dealCard(newDeck, newDealtCards);
    const deal2 = dealCard(deal1.newDeck, deal1.newDealtCards);
    const deal3 = dealCard(deal2.newDeck, deal2.newDealtCards);
    const deal4 = dealCard(deal3.newDeck, deal3.newDealtCards);

    const newPlayerHand = [deal1.card, deal3.card];
    const newDealerHand = [deal2.card, deal4.card];

    setDeck(deal4.newDeck);
    setDealtCards(deal4.newDealtCards);
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);

    const pScore = calculateScore(newPlayerHand);
    const dScore = calculateScore(newDealerHand);

    setPlayerScore(pScore);
    setDealerScore(dScore);

    if (pScore === 21) {
      setGameState('gameOver');
      const winAmount = Math.floor(betAmount * 2.5);
      setChips(chips + winAmount);
      setMessage(`BLACKJACK! You win $${winAmount}!`);
    } else {
      setGameState('playing');
      setMessage('');
    }
  };

  const hit = () => {
    const result = dealCard(deck, dealtCards);
    const newHand = [...playerHand, result.card];
    setPlayerHand(newHand);
    setDeck(result.newDeck);
    setDealtCards(result.newDealtCards);

    const score = calculateScore(newHand);
    setPlayerScore(score);

    if (score > 21) {
      setGameState('gameOver');
      setMessage(`BUST! You lose $${bet}`);
    } else if (score === 21) {
      stand(newHand, result.newDeck, result.newDealtCards);
    }
  };

  const doubleDown = () => {
    if (chips < bet) {
      setMessage('Not enough chips to double down!');
      return;
    }
    
    setChips(chips - bet);
    setBet(bet * 2);
    
    const result = dealCard(deck, dealtCards);
    const newHand = [...playerHand, result.card];
    setPlayerHand(newHand);
    setDeck(result.newDeck);
    setDealtCards(result.newDealtCards);

    const score = calculateScore(newHand);
    setPlayerScore(score);

    if (score > 21) {
      setGameState('gameOver');
      setMessage(`BUST! You lose $${bet}`);
    } else {
      stand(newHand, result.newDeck, result.newDealtCards);
    }
  };

  const stand = (currentHand = playerHand, currentDeck = deck, currentDealtCards = dealtCards) => {
    setGameState('dealerTurn');
    let newDealerHand = [...dealerHand];
    let newDeck = [...currentDeck];
    let newDealtCards = [...currentDealtCards];
    let dScore = calculateScore(newDealerHand);

    setTimeout(() => {
      while (dScore < 17) {
        const result = dealCard(newDeck, newDealtCards);
        newDealerHand.push(result.card);
        newDeck = result.newDeck;
        newDealtCards = result.newDealtCards;
        dScore = calculateScore(newDealerHand);
      }

      setDealerHand(newDealerHand);
      setDealerScore(dScore);
      setDeck(newDeck);
      setDealtCards(newDealtCards);

      const pScore = calculateScore(currentHand);
      determineWinner(pScore, dScore);
    }, 1000);
  };

  const determineWinner = (pScore, dScore) => {
    setGameState('gameOver');
    
    if (dScore > 21) {
      const winAmount = bet * 2;
      setChips(chips + bet + winAmount);
      setMessage(`Dealer Busts! You win $${winAmount}!`);
    } else if (pScore > dScore) {
      const winAmount = bet * 2;
      setChips(chips + bet + winAmount);
      setMessage(`You Win $${winAmount}!`);
    } else if (pScore < dScore) {
      setMessage(`Dealer Wins. You lose $${bet}`);
    } else {
      setChips(chips + bet);
      setMessage('Push! Bet returned');
    }
  };

  const newRound = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setPlayerScore(0);
    setDealerScore(0);
    setBet(0);
    setGameState('betting');
    setMessage('Place your bet to start');
  };

  const canSplit = () => {
    return playerHand.length === 2 && playerHand[0].value === playerHand[1].value && chips >= bet;
  };

  const canDoubleDown = () => {
    return playerHand.length === 2 && chips >= bet;
  };

  // ==================== INITIALIZE DECK ====================
  useEffect(() => {
    setDeck(createDeck());
  }, []);

  // ==================== COMPONENT STYLES ====================
  const cardStyle = {
    width: '96px',
    height: '144px',
    borderRadius: '8px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px',
    transition: 'transform 0.2s',
    cursor: 'pointer'
  };

  // ==================== CARD COMPONENT ====================
  const Card = ({ card, hidden }) => (
    <div 
      style={{
        ...cardStyle,
        background: hidden ? 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)' : '#ffffff',
        border: '3px solid rgba(255,255,255,0.3)',
        color: hidden ? '#ffffff' : getSuitColor(card.suit)
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {hidden ? (
        <div style={{ fontSize: '60px', opacity: 0.3 }}>?</div>
      ) : (
        <>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{card.value}</div>
          <div style={{ fontSize: '48px' }}>{card.suit}</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', transform: 'rotate(180deg)' }}>{card.value}</div>
        </>
      )}
    </div>
  );

  // ==================== CHIP BUTTON COMPONENT ====================
  const chipColors = {
    1: { light: '#ffffff', dark: '#cccccc' },
    5: { light: '#ef4444', dark: '#b91c1c' },
    25: { light: '#22c55e', dark: '#15803d' },
    100: { light: '#000000', dark: '#1f2937' },
    500: { light: '#a855f7', dark: '#7e22ce' }
  };

  const ChipButton = ({ value, onClick, disabled }) => {
    const colors = chipColors[value];
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          fontWeight: 'bold',
          fontSize: '18px',
          color: 'white',
          background: `radial-gradient(circle at 30% 30%, ${colors.light}, ${colors.dark})`,
          border: '4px solid rgba(255,255,255,0.3)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'transform 0.2s',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}
        onMouseEnter={(e) => !disabled && (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {value}
      </button>
    );
  };

  // ==================== CARD COUNTER DISPLAY ====================
  const cardCounts = getCardCount();
  const groupedCounts = {};
  
  // Group by value
  values.forEach(value => {
    groupedCounts[value] = {
      dealt: 0,
      remaining: 0
    };
    suits.forEach(suit => {
      const key = `${value}${suit}`;
      groupedCounts[value].dealt += cardCounts[key].dealt;
      groupedCounts[value].remaining += cardCounts[key].remaining;
    });
  });

  // ==================== MAIN RENDER ====================
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'linear-gradient(180deg, #4a0e0e 0%, #1a0505 100%)',
      position: 'relative'
    }}>
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        {/* ==================== HEADER ==================== */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '60px',
            fontWeight: 'bold',
            marginBottom: '8px',
            background: 'linear-gradient(180deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: 'serif'
          }}>Blackjack Table</h1>
          <div style={{ fontSize: '20px', color: '#fcd34d' }}>
            Status: <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{gameState}</span>
          </div>
          <div style={{ fontSize: '16px', color: '#fcd34d', marginTop: '8px' }}>
            Cards Remaining: {deck.length} / 312 | Dealt: {dealtCards.length}
          </div>
        </div>

        {/* ==================== MAIN TABLE ==================== */}
        <div style={{
          borderRadius: '24px',
          background: 'linear-gradient(180deg, #0a5c3a 0%, #064d2e 100%)',
          border: '12px solid #4a1c1c',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
          padding: '48px'
        }}>
          {/* ==================== DEALER SECTION ==================== */}
          <div style={{ marginBottom: '64px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(0,0,0,0.4)',
                padding: '8px 24px',
                borderRadius: '9999px'
              }}>
                <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>Dealer</div>
                <div style={{ color: '#fcd34d', fontSize: '20px' }}>
                  Value: {gameState === 'playing' ? calculateScore([dealerHand[0]]) : dealerScore}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {dealerHand.map((card, i) => (
                <Card key={i} card={card} hidden={i === 1 && gameState === 'playing'} />
              ))}
            </div>
          </div>

          {/* ==================== MESSAGE AREA ==================== */}
          {message && (
            <div style={{ textAlign: 'center', margin: '32px 0' }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(0,0,0,0.6)',
                padding: '16px 32px',
                borderRadius: '12px',
                border: '2px solid #fbbf24'
              }}>
                <div style={{ color: '#fcd34d', fontSize: '24px', fontWeight: 'bold' }}>{message}</div>
              </div>
            </div>
          )}

          {/* ==================== PLAYER SECTION ==================== */}
          <div style={{ marginTop: '64px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(0,0,0,0.4)',
                padding: '8px 24px',
                borderRadius: '9999px'
              }}>
                <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>Player</div>
                <div style={{ color: '#fcd34d', fontSize: '20px' }}>Value: {playerScore || 0}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {playerHand.map((card, i) => (
                <Card key={i} card={card} />
              ))}
            </div>
          </div>

          {/* ==================== ACTION BUTTONS ==================== */}
          <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {gameState === 'playing' && (
              <>
                <button
                  onClick={hit}
                  style={{
                    padding: '16px 40px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    color: 'white',
                    background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Hit
                </button>
                <button
                  onClick={() => stand()}
                  style={{
                    padding: '16px 40px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    color: 'white',
                    background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Stand
                </button>
                {canDoubleDown() && (
                  <button
                    onClick={doubleDown}
                    style={{
                      padding: '16px 40px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      fontSize: '20px',
                      color: 'white',
                      background: 'linear-gradient(180deg, #2563eb 0%, #1e40af 100%)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Double
                  </button>
                )}
                {canSplit() && (
                  <button
                    onClick={() => setMessage('Split feature coming soon!')}
                    disabled
                    style={{
                      padding: '16px 40px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      fontSize: '20px',
                      color: 'white',
                      background: 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      cursor: 'not-allowed',
                      opacity: 0.5,
                      transition: 'transform 0.2s',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    Split
                  </button>
                )}
              </>
            )}
            
            {gameState === 'gameOver' && (
              <button
                onClick={newRound}
                disabled={chips === 0}
                style={{
                  padding: '16px 40px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '20px',
                  color: 'white',
                  background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  cursor: chips === 0 ? 'not-allowed' : 'pointer',
                  opacity: chips === 0 ? 0.5 : 1,
                  transition: 'transform 0.2s',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                onMouseEnter={(e) => chips > 0 && (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {chips === 0 ? 'Game Over' : 'Deal Cards'}
              </button>
            )}
          </div>
        </div>

        {/* ==================== CHIPS PANEL (Right Side) ==================== */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '16px',
            padding: '24px',
            border: '2px solid #d97706',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
              Your Chips
            </div>
            <div style={{ color: '#fcd34d', fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
              ${chips}
            </div>
            {gameState === 'betting' && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <ChipButton value={1} onClick={() => placeBet(1)} disabled={chips < 1} />
                <ChipButton value={5} onClick={() => placeBet(5)} disabled={chips < 5} />
                <ChipButton value={25} onClick={() => placeBet(25)} disabled={chips < 25} />
                <ChipButton value={100} onClick={() => placeBet(100)} disabled={chips < 100} />
                <ChipButton value={500} onClick={() => placeBet(500)} disabled={chips < 500} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== CARD COUNTER (Bottom Left) ==================== */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        background: 'rgba(0,0,0,0.9)',
        borderRadius: '12px',
        padding: '12px',
        border: '2px solid #fbbf24',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        maxHeight: '320px',
        overflowY: 'auto',
        width: '200px'
      }}>
        <div style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>
          Card Counter
        </div>
        <div style={{ fontSize: '10px', color: '#fcd34d', marginBottom: '8px', textAlign: 'center' }}>
          6-Deck Shoe
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          {values.map(value => (
            <div key={value} style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '4px',
              textAlign: 'center'
            }}>
              <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>
                {value}
              </div>
              <div style={{ color: '#22c55e', fontSize: '9px' }}>
                {groupedCounts[value].remaining}
              </div>
              <div style={{ color: '#ef4444', fontSize: '9px' }}>
                {groupedCounts[value].dealt}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlackjackGame;

  // Changes as of 10/7/2025