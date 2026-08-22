import React, { useState, useEffect } from 'react';

/**
 * 👑 PAINEL DO MESTRE MURILO (Alt + Shift + M)
 * Injetado automaticamente para testes, trapaças de desenvolvedor e depuração em todos os jogos.
 */
export function MuriloMasterAdmin() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Atalho: Alt + Shift + M
      if (e.altKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const showMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleAddCoins = () => {
    try {
      // Injeta saldo em múltiplos formatos de storage comuns
      const keys = ['player_coins', 'coins', 'chips', 'balance', 'mico_prefs', 'bj_profile', 'user_profile'];
      keys.forEach((k) => {
        const val = localStorage.getItem(k);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object') {
              if ('balance' in parsed) parsed.balance = (Number(parsed.balance) || 0) + 50000;
              if ('coins' in parsed) parsed.coins = (Number(parsed.coins) || 0) + 50000;
              if ('chips' in parsed) parsed.chips = (Number(parsed.chips) || 0) + 50000;
              localStorage.setItem(k, JSON.stringify(parsed));
            } else if (typeof parsed === 'number') {
              localStorage.setItem(k, JSON.stringify(parsed + 50000));
            }
          } catch {
            localStorage.setItem(k, '50000');
          }
        } else {
          localStorage.setItem(k, '50000');
        }
      });
      showMsg('💰 +50.000 Fichas/Moedas injetadas com sucesso!');
    } catch {
      showMsg('Erro ao adicionar moedas.');
    }
  };

  const handleUnlockAll = () => {
    try {
      localStorage.setItem('all_unlocked', 'true');
      localStorage.setItem('vip_status', 'true');
      showMsg('👑 Todos os temas, itens e modos desbloqueados!');
    } catch {
      showMsg('Erro ao desbloquear.');
    }
  };

  const handleInstantWin = () => {
    showMsg('🏆 Sinal de Vitória enviado ao jogo!');
    window.dispatchEvent(new CustomEvent('ADMIN_INSTANT_WIN', { detail: { winner: 'player' } }));
  };

  const handleRevealCards = () => {
    showMsg('🃏 Modo Raio-X ativado (Cartas reveladas)!');
    window.dispatchEvent(new CustomEvent('ADMIN_REVEAL_CARDS', { detail: { xray: true } }));
    document.querySelectorAll('[data-card-hidden], .card-back, .carta-oculta').forEach((el) => {
      el.style.opacity = '0.35';
      el.style.filter = 'brightness(1.5)';
    });
  };

  const handleResetData = () => {
    if (window.confirm('Deseja resetar o progresso local deste jogo para testes?')) {
      localStorage.clear();
      sessionStorage.clear();
      showMsg('🔄 Dados resetados!');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 999999,
        background: '#0d1117',
        border: '3px solid #facc15',
        borderRadius: '16px',
        padding: '16px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(250,204,21,0.4)',
        minWidth: '280px',
        maxWidth: '340px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #30363d', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>👑</span>
          <div>
            <div style={{ fontWeight: '900', fontSize: '13px', color: '#facc15', letterSpacing: '0.05em' }}>PAINEL DO MESTRE MURILO</div>
            <div style={{ fontSize: '10px', color: '#8b949e' }}>Modo Administrador (Alt + Shift + M)</div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >
          ✕
        </button>
      </div>

      {feedback && (
        <div style={{ background: '#1e3a8a', color: '#93c5fd', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
          {feedback}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleAddCoins}
          style={{ background: '#eab308', color: '#000', border: '2px solid #000', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
        >
          💰 +50.000 Moedas / Fichas Infinitas
        </button>

        <button
          onClick={handleRevealCards}
          style={{ background: '#3b82f6', color: '#fff', border: '2px solid #000', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
        >
          🃏 Modo Raio-X (Revelar Cartas)
        </button>

        <button
          onClick={handleUnlockAll}
          style={{ background: '#8b5cf6', color: '#fff', border: '2px solid #000', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
        >
          ⚡ Desbloquear Tudo (Temas & Itens)
        </button>

        <button
          onClick={handleInstantWin}
          style={{ background: '#10b981', color: '#000', border: '2px solid #000', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
        >
          🏆 Forçar Vitória (Testar Win Screen)
        </button>

        <button
          onClick={handleResetData}
          style={{ background: '#ef4444', color: '#fff', border: '2px solid #000', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', textAlign: 'left' }}
        >
          🔄 Resetar Dados do Jogo
        </button>
      </div>

      <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '9px', color: '#8b949e', borderTop: '1px solid #21262d', paddingTop: '6px' }}>
        Pressione <strong style={{ color: '#facc15' }}>Alt + Shift + M</strong> para fechar/abrir
      </div>
    </div>
  );
}
