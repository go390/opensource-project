from stock_data_collector.config import MODEL_PATH
import lightgbm as lgb
from stock_data import prepare
import shap

def train():
    X_train, y_train, X_test, y_test = prepare()

    train_set = lgb.Dataset(X_train, label=y_train)
    valid_set = lgb.Dataset(X_test,  label=y_test, reference=train_set)

    params = {
        'objective':  'binary',
        'metric':     'binary_logloss',
        'verbosity':  -1,
    }
    
    model = lgb.train(
        params,
        train_set,
        num_boost_round=1000,
        valid_sets=[train_set, valid_set],
        valid_names=['train', 'valid'],
        callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)],
    )

    model.save_model(MODEL_PATH)
    return model

if __name__ == '__main__':
    train()