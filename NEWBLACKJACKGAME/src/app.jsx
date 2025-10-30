

import React, { useState, useEffect } from 'react';

const BlackjackGame = () => {
  const [deck, setDeck] = useState([]);
  const [dealtCards, setDealtCards] = useState([]);
  const [numPlayers, setNumPlayers] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [dealerHand, setDealerHand] = useState([]);
  const [gameState, setGameState] = useState('modeSelect');
  const [message, setMessage] = useState('Select number of players');
  const [dealerScore, setDealerScore] = useState(0);
  const [players, setPlayers] = useState([
    { hand: [], score: 0, chips: 10000, bet: 0, name: 'Player 1', isAI: false, aiStyle: null },
    { hand: [], score: 0, chips: 10000, bet: 0, name: 'Player 2', isAI: true, aiStyle: null },
    { hand: [], score: 0, chips: 10000, bet: 0, name: 'Player 3', isAI: true, aiStyle: null }
  ]);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiPlayerIndex, setAiPlayerIndex] = useState(null);
  const [selectedAIStyles, setSelectedAIStyles] = useState({ player2: null, player3: null });

  const suits = ['♥', '♦', '♣', '♠'];
  const suitNames = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const getSuitColor = (suit) => {
    return suit === '♥' || suit === '♦' ? '#dc2626' : '#000000';
  };

  const createDeck = () => {
    const newDeck = [];
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

  const dealCard = (currentDeck, currentDealtCards) => {
    const newDeck = [...currentDeck];
    const card = newDeck.pop();
    const newDealtCards = [...currentDealtCards, card];
    return { card, newDeck, newDealtCards };
  };

  const getCardCount = () => {
    const cardCounts = {};
    for (let suit of suits) {
      for (let value of values) {
        const key = `${value}${suit}`;
        cardCounts[key] = { dealt: 0, remaining: 6 };
      }
    }
    for (let card of dealtCards) {
      const key = `${card.value}${card.suit}`;
      if (cardCounts[key]) {
        cardCounts[key].dealt += 1;
        cardCounts[key].remaining = 6 - cardCounts[key].dealt;
      }
    }
    return cardCounts;
  };

  const getAIDecision = async (hand, dealerUpCard, chips, bet, playStyle, playerName) => {
    const score = calculateScore(hand);
    const dealerValue = dealerUpCard.value === 'A' ? 11 : ['K', 'Q', 'J'].includes(dealerUpCard.value) ? 10 : parseInt(dealerUpCard.value);
    const canDouble = hand.length === 2 && chips >= bet;
    const hasAce = hand.some(c => c.value === 'A');
    const isSoft = hasAce && score <= 21;
    
    const aggressivePrompt = `You are an aggressive blackjack player. Always hit if total is 16 or less. Hit on soft 17. Double frequently. Current: ${playerName} hand ${hand.map(c => c.value + c.suit).join(', ')}, score ${score} ${isSoft ? '(soft)' : ''}, dealer ${dealerUpCard.value}${dealerUpCard.suit}, can double ${canDouble}. Respond ONLY: ACTION: [HIT/STAND/DOUBLE] - REASON: [10 words max]`;
    const safePrompt = `You are a safe blackjack player. Stand on 15+. Stand on 12+ vs strong dealer. Only double 10-11 vs weak dealer. Current: ${playerName} hand ${hand.map(c => c.value + c.suit).join(', ')}, score ${score} ${isSoft ? '(soft)' : ''}, dealer ${dealerUpCard.value}${dealerUpCard.suit}, can double ${canDouble}. Respond ONLY: ACTION: [HIT/STAND/DOUBLE] - REASON: [10 words max]`;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: playStyle === 'aggressive' ? aggressivePrompt : safePrompt }] }],
          generationConfig: { temperature: playStyle === 'aggressive' ? 0.9 : 0.3, maxOutputTokens: 100 }
        })
      });
      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;
      const actionMatch = responseText.match(/ACTION:\s*(HIT|STAND|DOUBLE)/i);
      const reasonMatch = responseText.match(/REASON:\s*(.+)/i);
      return { action: actionMatch ? actionMatch[1].toUpperCase() : 'STAND', reason: reasonMatch ? reasonMatch[1].trim() : 'Playing it safe' };
    } catch (error) {
      console.error('AI Error:', error);
      return getRuleBasedDecision(hand, dealerUpCard, chips, bet, playStyle);
    }
  };

  const getRuleBasedDecision = (hand, dealerUpCard, chips, bet, playStyle) => {
    const score = calculateScore(hand);
    const dealerValue = dealerUpCard.value === 'A' ? 11 : ['K', 'Q', 'J'].includes(dealerUpCard.value) ? 10 : parseInt(dealerUpCard.value);
    const canDouble = hand.length === 2 && chips >= bet;
    const hasAce = hand.some(c => c.value === 'A');
    const isSoft = hasAce && score <= 21;

    if (playStyle === 'aggressive') {
      if (canDouble && (score === 10 || score === 11)) return { action: 'DOUBLE', reason: 'Double down!' };
      if (isSoft && score === 17) return { action: 'HIT', reason: 'Soft 17, hitting' };
      if (score <= 16) return { action: 'HIT', reason: 'Fortune favors bold!' };
      return { action: 'STAND', reason: 'Got strong hand' };
    } else {
      if (score >= 15) return { action: 'STAND', reason: 'Playing safe on 15+' };
      if (score >= 12) return { action: 'STAND', reason: 'Better safe than bust' };
      if (canDouble && score === 11 && dealerValue >= 4 && dealerValue <= 6) return { action: 'DOUBLE', reason: 'Safe double' };
      if (score <= 11) return { action: 'HIT', reason: 'Cannot bust' };
      return { action: 'STAND', reason: 'Preserving total' };
    }
  };

  const handleAITurn = async (currentPlayers, playerIndex, currentDeck, currentDealtCards, currentDealerHand) => {
    const player = currentPlayers[playerIndex];
    setAiThinking(true);
    setCurrentPlayer(playerIndex); // Set it here too
    setMessage(`${player.name} is thinking...`);
    
    const decision = await getAIDecision(
      player.hand,
      currentDealerHand[0],
      player.chips,
      player.bet,
      player.aiStyle,
      player.name
    );
    
    setAiExplanation(`${player.name}: ${decision.reason}`);
    
    setTimeout(() => {
      setAiThinking(false);
      setAiExplanation('');
      
      // Pass the playerIndex directly to the action functions
      if (decision.action === 'HIT') {
        hit(playerIndex);
      } else if (decision.action === 'DOUBLE') {
        doubleDown(playerIndex);
      } else {
        stand(playerIndex);
      }
    }, 2000);
  };

  const selectMode = (num) => {
    setNumPlayers(num);
    if (num === 1) {
      setGameState('betting');
      setMessage('Place your bet');
    } else {
      setGameState('aiSelect');
      setMessage('Select AI play styles');
    }
    const newPlayers = [...players];
    for (let i = 0; i < num; i++) {
      newPlayers[i] = { 
        hand: [], 
        score: 0, 
        chips: 10000, 
        bet: 0, 
        name: `Player ${i + 1}`,
        isAI: i > 0,  // Only Player 1 (index 0) is human
        aiStyle: null
      };
    }
    setPlayers(newPlayers);
    setCurrentPlayer(0);
  };

  const confirmAIStyles = () => {
    const newPlayers = [...players];
    if (numPlayers >= 2) newPlayers[1].aiStyle = selectedAIStyles.player2;
    if (numPlayers >= 3) newPlayers[2].aiStyle = selectedAIStyles.player3;
    setPlayers(newPlayers);
    setGameState('betting');
    setMessage('Place your bets');
  };

  const placeBet = (amount) => {
    const player = players[currentPlayer];
    
    // Validate bet amount for human players
    if (!player.isAI && amount > player.chips) {
      setMessage('Not enough chips!');
      return;
    }

    const newPlayers = [...players];
    newPlayers[currentPlayer].chips -= amount;
    newPlayers[currentPlayer].bet = amount;
    setPlayers(newPlayers);

    // Check if there are more players to bet
    if (currentPlayer < numPlayers - 1) {
      const nextPlayerIndex = currentPlayer + 1;
      
      // Move to next player
      setTimeout(() => {
        setCurrentPlayer(nextPlayerIndex);
        setMessage(`${newPlayers[nextPlayerIndex].name}, place your bet`);
        
        // If next player is AI, have them place bet automatically
        if (newPlayers[nextPlayerIndex].isAI) {
          setTimeout(() => {
            const aiBet = newPlayers[nextPlayerIndex].aiStyle === 'aggressive' ? 100 : 50;
            const finalBet = Math.min(aiBet, newPlayers[nextPlayerIndex].chips);
            
            // Directly update and move on (avoid recursive call)
            const updatedPlayers = [...newPlayers];
            updatedPlayers[nextPlayerIndex].chips -= finalBet;
            updatedPlayers[nextPlayerIndex].bet = finalBet;
            setPlayers(updatedPlayers);
            
            // Check if this was the last player
            if (nextPlayerIndex < numPlayers - 1) {
              // More players to go
              const nextNext = nextPlayerIndex + 1;
              setTimeout(() => {
                setCurrentPlayer(nextNext);
                setMessage(`${updatedPlayers[nextNext].name}, place your bet`);
                
                // If that player is also AI
                if (updatedPlayers[nextNext].isAI) {
                  setTimeout(() => {
                    const aiBet2 = updatedPlayers[nextNext].aiStyle === 'aggressive' ? 100 : 50;
                    const finalBet2 = Math.min(aiBet2, updatedPlayers[nextNext].chips);
                    
                    updatedPlayers[nextNext].chips -= finalBet2;
                    updatedPlayers[nextNext].bet = finalBet2;
                    setPlayers([...updatedPlayers]);
                    
                    // Now start the game
                    setTimeout(() => startGame(), 500);
                  }, 1000);
                }
              }, 500);
            } else {
              // This was the last player, start game
              setTimeout(() => startGame(), 500);
            }
          }, 1000);
        }
      }, 100);
    } else {
      // This was the last player, start game
      setTimeout(() => startGame(), 500);
    }
  };

  const startGame = () => {
    let newDeck = [...deck];
    let newDealtCards = [...dealtCards];
    
    if (newDeck.length < 15) {
      newDeck = createDeck();
      newDealtCards = [];
    }

    const newPlayers = [...players];
    
    for (let p = 0; p < numPlayers; p++) {
      const deal1 = dealCard(newDeck, newDealtCards);
      newDeck = deal1.newDeck;
      newDealtCards = deal1.newDealtCards;
      newPlayers[p].hand = [deal1.card];
    }

    const dealerDeal1 = dealCard(newDeck, newDealtCards);
    newDeck = dealerDeal1.newDeck;
    newDealtCards = dealerDeal1.newDealtCards;
    setDealerHand([dealerDeal1.card]);

    for (let p = 0; p < numPlayers; p++) {
      const deal2 = dealCard(newDeck, newDealtCards);
      newDeck = deal2.newDeck;
      newDealtCards = deal2.newDealtCards;
      newPlayers[p].hand.push(deal2.card);
    }

    const dealerDeal2 = dealCard(newDeck, newDealtCards);
    newDeck = dealerDeal2.newDeck;
    newDealtCards = dealerDeal2.newDealtCards;
    setDealerHand([dealerDeal1.card, dealerDeal2.card]);

    for (let p = 0; p < numPlayers; p++) {
      newPlayers[p].score = calculateScore(newPlayers[p].hand);
    }

    setDeck(newDeck);
    setDealtCards(newDealtCards);
    setPlayers(newPlayers);
    setDealerScore(calculateScore([dealerDeal1.card, dealerDeal2.card]));
    setCurrentPlayer(0);
    setGameState('playing');
    setMessage(`${newPlayers[0].name}'s turn`);
    
    // Remove this - Player 1 is always human!
    // Don't call handleAITurn here
  };

  const hit = (playerIndex = null) => {
    const actualPlayerIndex = playerIndex !== null ? playerIndex : currentPlayer;
    console.log('HIT called for player index:', actualPlayerIndex);
    console.log('Current player:', currentPlayer);
    console.log('Players array:', players);
    
    const result = dealCard(deck, dealtCards);
    const newPlayers = [...players];
    newPlayers[actualPlayerIndex].hand.push(result.card);
    newPlayers[actualPlayerIndex].score = calculateScore(newPlayers[actualPlayerIndex].hand);

    console.log('New score:', newPlayers[actualPlayerIndex].score);

    setDeck(result.newDeck);
    setDealtCards(result.newDealtCards);
    setPlayers(newPlayers);
    setCurrentPlayer(actualPlayerIndex);

    if (newPlayers[actualPlayerIndex].score > 21) {
      console.log('BUST!');
      setMessage(`${newPlayers[actualPlayerIndex].name} BUSTS!`);
      setTimeout(() => {
        if (actualPlayerIndex < numPlayers - 1) {
          const nextIdx = actualPlayerIndex + 1;
          setCurrentPlayer(nextIdx);
          setMessage(`${newPlayers[nextIdx].name}'s turn`);
          if (newPlayers[nextIdx].isAI) {
            setTimeout(() => handleAITurn(newPlayers, nextIdx, result.newDeck, result.newDealtCards, dealerHand), 1000);
          }
        } else {
          dealerTurn();
        }
      }, 1500);
    } else if (newPlayers[actualPlayerIndex].score === 21) {
      console.log('Got 21!');
      setTimeout(() => {
        if (actualPlayerIndex < numPlayers - 1) {
          const nextIdx = actualPlayerIndex + 1;
          setCurrentPlayer(nextIdx);
          setMessage(`${newPlayers[nextIdx].name}'s turn`);
          if (newPlayers[nextIdx].isAI) {
            setTimeout(() => handleAITurn(newPlayers, nextIdx, result.newDeck, result.newDealtCards, dealerHand), 1000);
          }
        } else {
          dealerTurn();
        }
      }, 1000);
    } else if (newPlayers[actualPlayerIndex].isAI) {
      console.log('AI continues...');
      setTimeout(() => {
        handleAITurn(newPlayers, actualPlayerIndex, result.newDeck, result.newDealtCards, dealerHand);
      }, 500);
    } else {
      console.log('Human player continues - should see new card');
    }
  };

  const stand = (playerIndex = null) => {
    const actualPlayerIndex = playerIndex !== null ? playerIndex : currentPlayer;
    
    if (actualPlayerIndex < numPlayers - 1) {
      const nextIdx = actualPlayerIndex + 1;
      setCurrentPlayer(nextIdx);
      setMessage(`${players[nextIdx].name}'s turn`);
      
      if (players[nextIdx].isAI) {
        setTimeout(() => {
          handleAITurn(players, nextIdx, deck, dealtCards, dealerHand);
        }, 1000);
      }
    } else {
      dealerTurn();
    }
  };

  const nextPlayer = () => {
    if (currentPlayer < numPlayers - 1) {
      const nextIdx = currentPlayer + 1;
      
      // Update current player state first
      setCurrentPlayer(nextIdx);
      setMessage(`${players[nextIdx].name}'s turn`);
      
      if (players[nextIdx].isAI) {
        // Use setTimeout to ensure state has updated
        setTimeout(() => {
          // Get fresh state by using the players array directly
          const freshPlayers = [...players];
          freshPlayers.forEach((p, i) => {
            if (i === nextIdx) {
              console.log(`AI Turn for ${p.name}, Score: ${p.score}`);
            }
          });
          
          handleAITurn(freshPlayers, nextIdx, deck, dealtCards, dealerHand);
        }, 1000);
      }
    } else {
      dealerTurn();
    }
  };

  const dealerTurn = () => {
    setGameState('dealerTurn');
    let newDealerHand = [...dealerHand];
    let newDeck = [...deck];
    let newDealtCards = [...dealtCards];
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
      determineWinners(dScore);
    }, 1000);
  };

  const determineWinners = (dScore) => {
    setGameState('gameOver');
    const newPlayers = [...players];
    let resultMsg = `Dealer: ${dScore}\n\n`;
    for (let p = 0; p < numPlayers; p++) {
      const pScore = newPlayers[p].score;
      const bet = newPlayers[p].bet;
      if (pScore > 21) {
        resultMsg += `${newPlayers[p].name}: BUST\n`;
      } else if (dScore > 21) {
        const winAmount = bet * 2;
        newPlayers[p].chips += bet + winAmount;
        resultMsg += `${newPlayers[p].name}: +$${winAmount}\n`;
      } else if (pScore > dScore) {
        const winAmount = bet * 2;
        newPlayers[p].chips += bet + winAmount;
        resultMsg += `${newPlayers[p].name}: +$${winAmount}\n`;
      } else if (pScore < dScore) {
        resultMsg += `${newPlayers[p].name}: Lost $${bet}\n`;
      } else {
        newPlayers[p].chips += bet;
        resultMsg += `${newPlayers[p].name}: Push\n`;
      }
    }
    setPlayers(newPlayers);
    setMessage(resultMsg);
  };

  const doubleDown = (playerIndex = null) => {
    const actualPlayerIndex = playerIndex !== null ? playerIndex : currentPlayer;
    const player = players[actualPlayerIndex];
    
    if (player.chips < player.bet) {
      setMessage('Not enough chips to double down!');
      return;
    }

    const result = dealCard(deck, dealtCards);
    const newPlayers = [...players];
    newPlayers[actualPlayerIndex].chips -= newPlayers[actualPlayerIndex].bet;
    newPlayers[actualPlayerIndex].bet *= 2;
    newPlayers[actualPlayerIndex].hand.push(result.card);
    newPlayers[actualPlayerIndex].score = calculateScore(newPlayers[actualPlayerIndex].hand);

    setDeck(result.newDeck);
    setDealtCards(result.newDealtCards);
    setPlayers(newPlayers);
    setCurrentPlayer(actualPlayerIndex);

    if (newPlayers[actualPlayerIndex].score > 21) {
      setMessage(`${newPlayers[actualPlayerIndex].name} BUSTS!`);
      setTimeout(() => {
        if (actualPlayerIndex < numPlayers - 1) {
          const nextIdx = actualPlayerIndex + 1;
          setCurrentPlayer(nextIdx);
          setMessage(`${newPlayers[nextIdx].name}'s turn`);
          if (newPlayers[nextIdx].isAI) {
            setTimeout(() => handleAITurn(newPlayers, nextIdx, result.newDeck, result.newDealtCards, dealerHand), 1000);
          }
        } else {
          dealerTurn();
        }
      }, 1500);
    } else {
      setTimeout(() => {
        if (actualPlayerIndex < numPlayers - 1) {
          const nextIdx = actualPlayerIndex + 1;
          setCurrentPlayer(nextIdx);
          setMessage(`${newPlayers[nextIdx].name}'s turn`);
          if (newPlayers[nextIdx].isAI) {
            setTimeout(() => handleAITurn(newPlayers, nextIdx, result.newDeck, result.newDealtCards, dealerHand), 1000);
          }
        } else {
          dealerTurn();
        }
      }, 500);
    }
  };

  const newRound = () => {
    setDealerHand([]);
    setGameState('betting');
    setMessage('Place your bets');
    setCurrentPlayer(0);
    setDealerScore(0);
    const newPlayers = [...players];
    for (let i = 0; i < numPlayers; i++) {
      newPlayers[i].hand = [];
      newPlayers[i].score = 0;
      newPlayers[i].bet = 0;
    }
    setPlayers(newPlayers);
  };

  const canDoubleDown = () => {
    return players[currentPlayer].hand.length === 2 && players[currentPlayer].chips >= players[currentPlayer].bet;
  };

  const endGame = () => {
    setNumPlayers(null);
    setCurrentPlayer(0);
    setDealerHand([]);
    setDealerScore(0);
    setDealtCards([]);
    setGameState('modeSelect');
    setMessage('Select number of players');
    setDeck(createDeck());
    setSelectedAIStyles({ player2: null, player3: null });
    const newPlayers = [
      { hand: [], score: 0, chips: 10000, bet: 0, name: 'Player 1', isAI: false, aiStyle: null },
      { hand: [], score: 0, chips: 10000, bet: 0, name: 'Player 2', isAI: true, aiStyle: null },
      { hand: [], score: 0, chips: 10000, bet: 0, name: 'Player 3', isAI: true, aiStyle: null }
    ];
    setPlayers(newPlayers);
  };

  useEffect(() => {
    setDeck(createDeck());
  }, []);

  const cardStyle = { width: '96px', height: '144px', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '8px' };

  const Card = ({ card, hidden }) => (
    <div style={{ ...cardStyle, background: hidden ? 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)' : '#ffffff', border: '3px solid rgba(255,255,255,0.3)', color: hidden ? '#ffffff' : getSuitColor(card.suit) }}>
      {hidden ? <div style={{ fontSize: '60px', opacity: 0.3 }}>?</div> : <><div style={{ fontSize: '24px', fontWeight: 'bold' }}>{card.value}</div><div style={{ fontSize: '48px' }}>{card.suit}</div><div style={{ fontSize: '24px', fontWeight: 'bold', transform: 'rotate(180deg)' }}>{card.value}</div></>}
    </div>
  );

  const cardCounts = getCardCount();
  const groupedCounts = {};
  values.forEach(value => {
    groupedCounts[value] = { dealt: 0, remaining: 0 };
    suits.forEach(suit => {
      const key = `${value}${suit}`;
      groupedCounts[value].dealt += cardCounts[key].dealt;
      groupedCounts[value].remaining += cardCounts[key].remaining;
    });
  });

  if (gameState === 'modeSelect') {
    return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #4a0e0e 0%, #1a0505 100%)' }}><div style={{ textAlign: 'center' }}><h1 style={{ fontSize: '72px', fontWeight: 'bold', marginBottom: '40px', background: 'linear-gradient(180deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'serif' }}>Blackjack</h1><div style={{ fontSize: '32px', color: '#fcd34d', marginBottom: '60px', fontWeight: 'bold' }}>Select Number of Players</div><div style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}><button onClick={() => selectMode(1)} style={{ padding: '24px 48px', borderRadius: '16px', fontWeight: 'bold', fontSize: '28px', color: 'white', background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)', border: '3px solid rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}>Solo</button><button onClick={() => selectMode(2)} style={{ padding: '24px 48px', borderRadius: '16px', fontWeight: 'bold', fontSize: '28px', color: 'white', background: 'linear-gradient(180deg, #2563eb 0%, #1e40af 100%)', border: '3px solid rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}>2 Players</button><button onClick={() => selectMode(3)} style={{ padding: '24px 48px', borderRadius: '16px', fontWeight: 'bold', fontSize: '28px', color: 'white', background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)', border: '3px solid rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}>3 Players</button></div></div></div>);
  }

  if (gameState === 'aiSelect') {
    return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #4a0e0e 0%, #1a0505 100%)' }}><div style={{ textAlign: 'center', maxWidth: '800px', padding: '40px' }}><h1 style={{ fontSize: '60px', fontWeight: 'bold', marginBottom: '20px', background: 'linear-gradient(180deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'serif' }}>Configure AI Players</h1><div style={{ fontSize: '20px', color: '#fcd34d', marginBottom: '40px' }}>You control Player 1. Select play styles for AI players:</div>{numPlayers >= 2 && (<div style={{ background: 'rgba(0,0,0,0.6)', padding: '24px', borderRadius: '16px', marginBottom: '24px', border: '2px solid #fbbf24' }}><div style={{ fontSize: '24px', color: 'white', marginBottom: '16px', fontWeight: 'bold' }}>Player 2 (AI)</div><div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}><button onClick={() => setSelectedAIStyles({...selectedAIStyles, player2: 'aggressive'})} style={{ padding: '16px 32px', borderRadius: '12px', fontWeight: 'bold', fontSize: '20px', color: 'white', background: selectedAIStyles.player2 === 'aggressive' ? 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)' : 'rgba(220, 38, 38, 0.3)', border: selectedAIStyles.player2 === 'aggressive' ? '3px solid #ffd700' : '2px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>🔥 Aggressive</button><button onClick={() => setSelectedAIStyles({...selectedAIStyles, player2: 'safe'})} style={{ padding: '16px 32px', borderRadius: '12px', fontWeight: 'bold', fontSize: '20px', color: 'white', background: selectedAIStyles.player2 === 'safe' ? 'linear-gradient(180deg, #2563eb 0%, #1e40af 100%)' : 'rgba(37, 99, 235, 0.3)', border: selectedAIStyles.player2 === 'safe' ? '3px solid #ffd700' : '2px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>🛡️ Safe</button></div></div>)}{numPlayers >= 3 && (<div style={{ background: 'rgba(0,0,0,0.6)', padding: '24px', borderRadius: '16px', marginBottom: '24px', border: '2px solid #fbbf24' }}><div style={{ fontSize: '24px', color: 'white', marginBottom: '16px', fontWeight: 'bold' }}>Player 3 (AI)</div><div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}><button onClick={() => setSelectedAIStyles({...selectedAIStyles, player3: 'aggressive'})} style={{ padding: '16px 32px', borderRadius: '12px', fontWeight: 'bold', fontSize: '20px', color: 'white', background: selectedAIStyles.player3 === 'aggressive' ? 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)' : 'rgba(220, 38, 38, 0.3)', border: selectedAIStyles.player3 === 'aggressive' ? '3px solid #ffd700' : '2px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>🔥 Aggressive</button><button onClick={() => setSelectedAIStyles({...selectedAIStyles, player3: 'safe'})} style={{ padding: '16px 32px', borderRadius: '12px', fontWeight: 'bold', fontSize: '20px', color: 'white', background: selectedAIStyles.player3 === 'safe' ? 'linear-gradient(180deg, #2563eb 0%, #1e40af 100%)' : 'rgba(37, 99, 235, 0.3)', border: selectedAIStyles.player3 === 'safe' ? '3px solid #ffd700' : '2px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>🛡️ Safe</button></div></div>)}<button onClick={confirmAIStyles} disabled={(numPlayers >= 2 && !selectedAIStyles.player2) || (numPlayers >= 3 && !selectedAIStyles.player3)} style={{ padding: '20px 48px', borderRadius: '16px', fontWeight: 'bold', fontSize: '24px', color: 'white', background: ((numPlayers >= 2 && !selectedAIStyles.player2) || (numPlayers >= 3 && !selectedAIStyles.player3)) ? 'rgba(128,128,128,0.5)' : 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)', border: '3px solid rgba(255,255,255,0.3)', cursor: ((numPlayers >= 2 && !selectedAIStyles.player2) || (numPlayers >= 3 && !selectedAIStyles.player3)) ? 'not-allowed' : 'pointer', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', marginTop: '32px' }}>Start Game</button><button onClick={() => { setGameState('modeSelect'); setSelectedAIStyles({ player2: null, player3: null }); }} style={{ padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', color: 'white', background: 'rgba(128,128,128,0.5)', border: '2px solid rgba(255,255,255,0.3)', cursor: 'pointer', marginTop: '16px', marginLeft: '16px' }}>Back</button></div></div>);
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'linear-gradient(180deg, #4a0e0e 0%, #1a0505 100%)', position: 'relative' }}>
      <div style={{ width: '100%', maxWidth: '1400px' }}>
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <button onClick={endGame} style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', color: 'white', background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)', border: '2px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>End Game</button>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '60px', fontWeight: 'bold', marginBottom: '8px', background: 'linear-gradient(180deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'serif' }}>Blackjack Table</h1>
          <div style={{ fontSize: '16px', color: '#fcd34d' }}>Cards: {deck.length} | Dealt: {dealtCards.length}</div>
        </div>
        <div style={{ borderRadius: '24px', background: 'linear-gradient(180deg, #0a5c3a 0%, #064d2e 100%)', border: '12px solid #4a1c1c', padding: '48px' }}>
          <div style={{ marginBottom: '64px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.4)', padding: '8px 24px', borderRadius: '9999px' }}>
              <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>Dealer</div>
              <div style={{ color: '#fcd34d', fontSize: '20px' }}>Value: {(gameState === 'playing' || gameState === 'betting') && dealerHand.length > 0 ? calculateScore([dealerHand[0]]) : dealerScore}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              {dealerHand.map((card, i) => (<Card key={i} card={card} hidden={i === 1 && (gameState === 'playing' || gameState === 'betting')} />))}
            </div>
          </div>
          {message && (<div style={{ textAlign: 'center', margin: '32px 0' }}><div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.6)', padding: '16px 32px', borderRadius: '12px', border: '2px solid #fbbf24' }}><div style={{ color: '#fcd34d', fontSize: '18px', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>{message}</div>{aiThinking && (<div style={{ color: '#22c55e', fontSize: '14px', marginTop: '8px', fontStyle: 'italic' }}>🤔 AI is thinking...</div>)}{aiExplanation && (<div style={{ color: '#fbbf24', fontSize: '14px', marginTop: '8px', fontStyle: 'italic' }}>💭 {aiExplanation}</div>)}</div></div>)}
          <div style={{ display: 'grid', gridTemplateColumns: numPlayers === 1 ? 'repeat(1, 1fr)' : numPlayers === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '32px', marginTop: '48px' }}>
            {players.slice(0, numPlayers).map((player, idx) => (
              <div key={idx} style={{ background: currentPlayer === idx && (gameState === 'playing' || gameState === 'betting') ? 'rgba(255, 215, 0, 0.1)' : 'transparent', borderRadius: '16px', padding: '16px', border: currentPlayer === idx && (gameState === 'playing' || gameState === 'betting') ? '2px solid #ffd700' : 'none' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.4)', padding: '8px 16px', borderRadius: '9999px' }}>
                    <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>{player.name}</div>
                    {player.isAI && player.aiStyle && (<div style={{ color: player.aiStyle === 'aggressive' ? '#ef4444' : '#3b82f6', fontSize: '14px', fontStyle: 'italic', marginTop: '4px' }}>{player.aiStyle === 'aggressive' ? '🔥 Aggressive AI' : '🛡️ Safe AI'}</div>)}
                    <div style={{ color: '#fcd34d', fontSize: '16px' }}>Score: {player.score}</div>
                    <div style={{ color: '#22c55e', fontSize: '14px' }}>Chips: ${player.chips}</div>
                    {player.bet > 0 && <div style={{ color: '#ef4444', fontSize: '14px' }}>Bet: ${player.bet}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {player.hand.map((card, i) => (<Card key={i} card={card} />))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {gameState === 'betting' && !players[currentPlayer].isAI && (<><button onClick={() => placeBet(10)} disabled={players[currentPlayer].chips < 10} style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', color: 'white', background: '#dc2626', border: 'none', cursor: 'pointer', opacity: players[currentPlayer].chips < 10 ? 0.5 : 1 }}>Bet $10</button><button onClick={() => placeBet(50)} disabled={players[currentPlayer].chips < 50} style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', color: 'white', background: '#dc2626', border: 'none', cursor: 'pointer', opacity: players[currentPlayer].chips < 50 ? 0.5 : 1 }}>Bet $50</button><button onClick={() => placeBet(100)} disabled={players[currentPlayer].chips < 100} style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', color: 'white', background: '#dc2626', border: 'none', cursor: 'pointer', opacity: players[currentPlayer].chips < 100 ? 0.5 : 1 }}>Bet $100</button></>)}
            {gameState === 'playing' && !players[currentPlayer].isAI && !aiThinking && (
  <>
    <button onClick={() => hit()} style={{ padding: '16px 40px', borderRadius: '12px', fontWeight: 'bold', fontSize: '20px', color: 'white', background: '#dc2626', border: 'none', cursor: 'pointer' }}>
      Hit
    </button>
    <button onClick={() => stand()} style={{ padding: '16px 40px', borderRadius: '12px', fontWeight: 'bold', fontSize: '20px', color: 'white', background: '#16a34a', border: 'none', cursor: 'pointer' }}>
      Stand
    </button>
    {canDoubleDown() && (
      <button onClick={() => doubleDown()} style={{ padding: '16px 40px', borderRadius: '12px', fontWeight: 'bold', fontSize: '20px', color: 'white', background: '#2563eb', border: 'none', cursor: 'pointer' }}>
        Double
      </button>
    )}
  </>
)}
            {gameState === 'gameOver' && (<button onClick={newRound} style={{ padding: '16px 40px', borderRadius: '12px', fontWeight: 'bold', fontSize: '20px', color: 'white', background: '#f59e0b', border: 'none', cursor: 'pointer' }}>Next Round</button>)}
          </div>
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.9)', borderRadius: '12px', padding: '12px', border: '2px solid #fbbf24', width: '200px' }}>
        <div style={{ color: '#ffd700', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>Card Counter</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          {values.map(value => (<div key={value} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px', textAlign: 'center' }}><div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>{value}</div><div style={{ color: '#22c55e', fontSize: '9px' }}>{groupedCounts[value].remaining}</div><div style={{ color: '#ef4444', fontSize: '9px' }}>{groupedCounts[value].dealt}</div></div>))}
        </div>
      </div>
    </div>
  );
};

export default BlackjackGame;