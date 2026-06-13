from stock_data_collector.config import MODEL_PATH
from stock_data_collector.db import DataBase
from stock_data import create_features, FEATURES
import numpy as np
import pandas as pd
import lightgbm as lgb
import shap
import json
from sqlalchemy import text, bindparam

FEATURE_LABELS = {
    'ma20_ratio': '20일 이동평균선 대비 주가',
    'ma60_ratio': '60일 이동평균선 대비 주가',
    'ma120_ratio': '120일 이동평균선 대비 주가',
    'rsi': 'RSI(상대강도지수)',
    'macd': 'MACD 추세',
    'BB': '볼린저밴드 내 위치',
    'hl_spread': '고가-저가 변동폭',
    'change_rate_ma5': '5일 평균 등락률',
    'change_rate_ma20': '20일 평균 등락률',
    'per': 'PER(주가수익비율)',
    'pbr': 'PBR(주가순자산비율)',
    'eps': 'EPS(주당순이익)',
    'div_yield': '배당수익률',
    'foreign_net_volume_5d': '외국인 5일 순매수',
    'foreign_net_volume_20d': '외국인 20일 순매수',
    'institution_net_volume_5d': '기관 5일 순매수',
    'institution_net_volume_20d': '기관 20일 순매수',
    'individual_net_volume_5d': '개인 5일 순매수',
    'individual_net_volume_20d': '개인 20일 순매수',
    'shorting_ratio_ma10': '공매도 비중(10일 평균)',
    'shorting_bal_ma10': '공매도 잔고(10일 평균)',
    'excess_return_ma20': '시장 대비 초과수익(20일)',
}

FEATURE_PHRASES = {
    'ma20_ratio': 'its price relative to the 20-day moving average',
    'ma60_ratio': 'its price relative to the 60-day moving average',
    'ma120_ratio': 'its price relative to the 120-day moving average',
    'rsi': 'its RSI momentum',
    'macd': 'its MACD trend',
    'BB': 'its position within the Bollinger Bands',
    'hl_spread': 'its intraday high-low volatility',
    'change_rate_ma5': 'its 5-day average return',
    'change_rate_ma20': 'its 20-day average return',
    'per': 'its P/E ratio',
    'pbr': 'its P/B ratio',
    'eps': 'its earnings per share',
    'div_yield': 'its dividend yield',
    'foreign_net_volume_5d': 'foreign net buying over the past 5 days',
    'foreign_net_volume_20d': 'foreign net buying over the past 20 days',
    'institution_net_volume_5d': 'institutional net buying over the past 5 days',
    'institution_net_volume_20d': 'institutional net buying over the past 20 days',
    'individual_net_volume_5d': 'retail net buying over the past 5 days',
    'individual_net_volume_20d': 'retail net buying over the past 20 days',
    'shorting_ratio_ma10': 'its 10-day average short-selling ratio',
    'shorting_bal_ma10': 'its 10-day average short-selling balance',
    'excess_return_ma20': 'its 20-day excess return versus the market',
}

SIGNAL_CLASS = {'sell': 0, 'neutral': 1, 'buy': 2}

SIGNAL_PHRASE = {
    'buy': 'BUY (the price is likely to rise)',
    'sell': 'SELL (the price is likely to fall)',
    'neutral': 'HOLD (no clear direction)',
}


def top_reasons(shap_row):
    """Top contributing features for one stock, sorted by impact magnitude."""
    order = np.argsort(np.abs(shap_row))[::-1][:4]
    return [
        {
            'feature': FEATURES[j],
            'label': FEATURE_LABELS.get(FEATURES[j], FEATURES[j]),
            'value': round(float(shap_row[j]), 4),
            'direction': 'up' if shap_row[j] > 0 else 'down',
        }
        for j in order
    ]


def _join(items):
    """Join phrases into a natural English list: 'A', 'A and B', 'A, B, and C'."""
    if len(items) <= 1:
        return items[0] if items else ''
    if len(items) == 2:
        return f'{items[0]} and {items[1]}'
    return ', '.join(items[:-1]) + f', and {items[-1]}'


def build_explanation(signal, reasons, probs):
    pct = lambda x: round(x * 100)

    if signal == 'neutral':
        return ("The AI sees no clear direction for this stock: the buy and sell signals are nearly balanced, so it suggests holding.")

    supporting = [FEATURE_PHRASES.get(r['feature'], r['feature']) for r in reasons if r['direction'] == 'up']
    opposing = [FEATURE_PHRASES.get(r['feature'], r['feature']) for r in reasons if r['direction'] == 'down']

    parts = [f"The AI predicts {SIGNAL_PHRASE[signal]}."]
    if supporting:
        parts.append(f"This is driven mainly by {_join(supporting)}, which pushed the prediction toward {signal}.")
    if opposing:
        noun = 'factor' if len(opposing) == 1 else 'factors'
        verb = 'was' if len(opposing) == 1 else 'were'
        parts.append(f"The main {noun} pointing the other way {verb} {_join(opposing)}.")
    return ' '.join(parts)


def predict_and_store(table_name='ai_signal'):
    features = create_features()
    features.ma_ratio()
    features.change_rate()
    features.volumes()
    features.shorting()
    features.features_etc()

    data = features.data.dropna(subset = FEATURES)
    latest = data.sort_values('date').groupby('ticker').tail(1).copy()

    model = lgb.Booster(model_file = MODEL_PATH)
    proba = model.predict(latest[FEATURES])
    latest['prob_sell'] = proba[:, 0]
    latest['prob_neutral'] = proba[:, 1]
    latest['prob_buy'] = proba[:, 2]

    diff = latest['prob_buy'] - latest['prob_sell']
    latest['signal'] = np.where(diff >= 0.05, 'buy',
                        np.where(diff <= -0.05, 'sell', 'neutral'))

    shap_values = shap.TreeExplainer(model).shap_values(latest[FEATURES])
    signals = latest['signal'].to_numpy()
    prob_by_signal = {
        'sell': latest['prob_sell'].to_numpy(),
        'neutral': latest['prob_neutral'].to_numpy(),
        'buy': latest['prob_buy'].to_numpy(),
    }

    reasons_col, explanation_col = [], []
    for i in range(len(latest)):
        sig = signals[i]
        reasons = top_reasons(shap_values[i, :, SIGNAL_CLASS[sig]])
        probs = {k: float(v[i]) for k, v in prob_by_signal.items()}
        reasons_col.append(json.dumps(reasons, ensure_ascii=False))
        explanation_col.append(build_explanation(sig, reasons, probs))
    latest['reasons'] = reasons_col
    latest['explanation'] = explanation_col

    out = latest[['ticker', 'date', 'prob_sell', 'prob_neutral', 'prob_buy', 'signal', 'reasons', 'explanation']].reset_index(drop=True)
    out['date'] = pd.to_datetime(out['date']).dt.date

    # 날짜별 이력 보관: 같은 날짜를 다시 예측하면 그 날짜만 교체하고 과거 예측은 유지
    db = DataBase()
    engine = db.connect()
    db.create_tables()  # ai_signal 스키마 보장 (PK: ticker+date)
    run_dates = list(dict.fromkeys(out['date'].tolist()))
    with engine.begin() as conn:
        conn.execute(
            text(f"DELETE FROM {table_name} WHERE date IN :dates").bindparams(
                bindparam('dates', expanding=True)),
            {'dates': run_dates},
        )
    out.to_sql(table_name, engine, if_exists='append', index=False)

    print(f"{table_name}에 {len(out)}개 종목 저장 완료 (날짜: {', '.join(map(str, run_dates))})")
    print(out['signal'].value_counts().to_string())
    return out

if __name__ == '__main__':
    predict_and_store()
