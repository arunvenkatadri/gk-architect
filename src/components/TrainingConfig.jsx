import React, { useState, useMemo } from 'react';
import useStore from '../store';

export default function TrainingConfig({ onClose, sendToTerminal }) {
  const trainingConfig = useStore((s) => s.trainingConfig);
  const setTrainingConfig = useStore((s) => s.setTrainingConfig);
  const generateModelCode = useStore((s) => s.generateModelCode);
  const generateTrainScript = useStore((s) => s.generateTrainScript);
  const [activeTab, setActiveTab] = useState('config');

  const modelCode = useMemo(() => generateModelCode(), [generateModelCode]);
  const trainScript = useMemo(() => generateTrainScript(), [generateTrainScript]);

  const handleChange = (key, value) => {
    setTrainingConfig({ [key]: value });
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  const handleSendToTerminal = () => {
    if (!sendToTerminal) return;
    const prompt = `Create the following Keras model and training script in the current project directory.\n\nSave as train.py:\n\n\`\`\`python\n${trainScript}\n\`\`\`\n\nThen create any helper modules needed (data loading, custom layers like PositionalEncoding, ResidualBlock, FeedForward if used). Make the training script fully functional.`;
    sendToTerminal(prompt);
    onClose();
  };

  const tabs = ['config', 'model', 'train.py'];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[700px] max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
           style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-surface)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          <div>
            <h2 className="text-lg font-semibold text-primary">Training Configuration</h2>
            <p className="text-xs text-secondary mt-0.5">Configure training and generate code from your architecture</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium capitalize transition-colors ${
                activeTab === tab ? 'text-accent border-b-2 border-accent' : 'text-secondary hover:text-primary'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-secondary block mb-1">Optimizer</label>
                  <select value={trainingConfig.optimizer} onChange={e => handleChange('optimizer', e.target.value)}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent">
                    <option value="adam">Adam</option>
                    <option value="adamW">AdamW</option>
                    <option value="sgd">SGD</option>
                    <option value="rmsprop">RMSprop</option>
                    <option value="adagrad">Adagrad</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">Learning Rate</label>
                  <input type="number" value={trainingConfig.learning_rate} step={0.0001}
                    onChange={e => handleChange('learning_rate', parseFloat(e.target.value))}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>

              <div>
                <label className="text-xs text-secondary block mb-1">Loss Function</label>
                <select value={trainingConfig.loss} onChange={e => handleChange('loss', e.target.value)}
                  className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent">
                  <option value="categorical_crossentropy">Categorical Crossentropy</option>
                  <option value="sparse_categorical_crossentropy">Sparse Categorical Crossentropy</option>
                  <option value="binary_crossentropy">Binary Crossentropy</option>
                  <option value="mse">Mean Squared Error</option>
                  <option value="mae">Mean Absolute Error</option>
                  <option value="huber">Huber</option>
                  <option value="cosine_similarity">Cosine Similarity</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-secondary block mb-1">Batch Size</label>
                  <input type="number" value={trainingConfig.batch_size}
                    onChange={e => handleChange('batch_size', parseInt(e.target.value))}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">Epochs</label>
                  <input type="number" value={trainingConfig.epochs}
                    onChange={e => handleChange('epochs', parseInt(e.target.value))}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">Val Split</label>
                  <input type="number" value={trainingConfig.validation_split} step={0.05}
                    onChange={e => handleChange('validation_split', parseFloat(e.target.value))}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-secondary">Early Stopping</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleChange('early_stopping', !trainingConfig.early_stopping)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${trainingConfig.early_stopping ? 'bg-accent' : 'bg-surface'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${trainingConfig.early_stopping ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  {trainingConfig.early_stopping && (
                    <input type="number" value={trainingConfig.patience}
                      onChange={e => handleChange('patience', parseInt(e.target.value))}
                      className="w-16 bg-canvas border border-surface rounded px-2 py-1 text-xs text-primary"
                      placeholder="patience" />
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-secondary block mb-1">Dataset Path</label>
                <input type="text" value={trainingConfig.dataset}
                  onChange={e => handleChange('dataset', e.target.value)}
                  placeholder="path/to/dataset or huggingface dataset name"
                  className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div>
              {modelCode ? (
                <>
                  <div className="flex justify-end mb-2">
                    <button onClick={() => handleCopyCode(modelCode)}
                      className="text-xs text-accent hover:text-accent-hover">Copy</button>
                  </div>
                  <pre className="bg-canvas/50 rounded-lg p-4 text-xs text-secondary font-mono whitespace-pre-wrap overflow-auto max-h-[50vh]">
                    {modelCode}
                  </pre>
                </>
              ) : (
                <div className="text-center py-12 text-secondary text-sm">
                  Add ML layers to the canvas to generate model code.
                </div>
              )}
            </div>
          )}

          {activeTab === 'train.py' && (
            <div>
              {trainScript ? (
                <>
                  <div className="flex justify-end mb-2 gap-2">
                    <button onClick={() => handleCopyCode(trainScript)}
                      className="text-xs text-accent hover:text-accent-hover">Copy</button>
                  </div>
                  <pre className="bg-canvas/50 rounded-lg p-4 text-xs text-secondary font-mono whitespace-pre-wrap overflow-auto max-h-[50vh]">
                    {trainScript}
                  </pre>
                </>
              ) : (
                <div className="text-center py-12 text-secondary text-sm">
                  Add ML layers to generate training script.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-2" style={{ borderTop: '1px solid var(--color-surface)' }}>
          <button onClick={handleSendToTerminal}
            disabled={!trainScript}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Build with Claude
          </button>
        </div>
      </div>
    </div>
  );
}
