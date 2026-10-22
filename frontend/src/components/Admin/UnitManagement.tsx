import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface UnitOption {
  label: string;
  value: number;
}

interface UnitConfig {
  _id: string;
  unitType: string;
  label: string;
  options: UnitOption[];
  allowCustom: boolean;
  customPlaceholder: string;
  isActive: boolean;
  order: number;
}

export default function UnitManagement() {
  const [unitConfigs, setUnitConfigs] = useState<UnitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<UnitConfig | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    unitType: '',
    label: '',
    options: [] as UnitOption[],
    allowCustom: true,
    customPlaceholder: '',
    isActive: true,
    order: 0,
  });

  const [newOption, setNewOption] = useState({ label: '', value: 0 });

  useEffect(() => {
    fetchUnitConfigs();
  }, []);

  const fetchUnitConfigs = async () => {
    try {
      const response = await axios.get('/api/unit-configs');
      setUnitConfigs(response.data);
    } catch {
      toast.error('Failed to load unit configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedConfigs = async () => {
    try {
      await axios.post('/api/unit-configs/seed');
      toast.success('Default configurations created successfully!');
      fetchUnitConfigs();
    } catch (error: unknown) {
      toast.error((axios.isAxiosError<{message:string}>(error)?error.response?.data.message:undefined) || 'Failed to seed configurations');
    }
  };

  const handleAddOption = () => {
    if (!newOption.label || !newOption.value) {
      toast.error('Please provide both label and value');
      return;
    }
    setFormData({
      ...formData,
      options: [...formData.options, { ...newOption }],
    });
    setNewOption({ label: '', value: 0 });
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingConfig) {
        await axios.put(`/api/unit-configs/${editingConfig._id}`, formData);
        toast.success('Unit configuration updated successfully!');
      } else {
        await axios.post('/api/unit-configs', formData);
        toast.success('Unit configuration created successfully!');
      }
      setShowModal(false);
      setEditingConfig(null);
      resetForm();
      fetchUnitConfigs();
    } catch (error: unknown) {
      toast.error((axios.isAxiosError<{message:string}>(error)?error.response?.data.message:undefined) || 'Failed to save configuration');
    }
  };

  const handleEdit = (config: UnitConfig) => {
    setEditingConfig(config);
    setFormData({
      unitType: config.unitType,
      label: config.label,
      options: config.options,
      allowCustom: config.allowCustom,
      customPlaceholder: config.customPlaceholder,
      isActive: config.isActive,
      order: config.order,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unit configuration?')) return;
    
    try {
      await axios.delete(`/api/unit-configs/${id}`);
      toast.success('Unit configuration deleted successfully!');
      fetchUnitConfigs();
    } catch {
      toast.error('Failed to delete configuration');
    }
  };

  const resetForm = () => {
    setFormData({
      unitType: '',
      label: '',
      options: [],
      allowCustom: true,
      customPlaceholder: '',
      isActive: true,
      order: 0,
    });
    setNewOption({ label: '', value: 0 });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingConfig(null);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900">Measurement units</h2>
        <div className="flex flex-wrap items-center gap-2">
          {unitConfigs.length === 0 && (
            <button
              onClick={handleSeedConfigs}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Seed Default Configs
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Unit Type
          </button>
        </div>
      </div>

      {/* Unit Configs List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {unitConfigs.map((config) => (
          <div key={config._id} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {config.unitType}
                  </span>
                  {config.isActive ? (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Active</span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Inactive</span>
                  )}
                </div>
                
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
                  <div className="flex flex-wrap gap-2">
                    {config.options.map((option, index) => (
                      <div key={index} className="text-[11px] bg-blue-50/60 text-slate-500 px-2.5 py-1.5 rounded-lg">
                        {option.label} ({option.value})
                      </div>
                    ))}
                  </div>
                  {config.options.length === 0 && (
                    <p className="text-sm text-gray-500">No predefined options</p>
                  )}
                </div>

                <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                  <span>Custom Input: {config.allowCustom ? 'Enabled' : 'Disabled'}</span>
                  {config.allowCustom && (
                    <span className="italic">"{config.customPlaceholder}"</span>
                  )}
                  <span>Order: {config.order}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(config)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(config._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-4">
                {editingConfig ? 'Edit Unit Configuration' : 'Create Unit Configuratisdadon'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Type (ID)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.unitType}
                      onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., square, unit, custom"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Label
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Square Feet"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Placeholder
                  </label>
                  <input
                    type="text"
                    value={formData.customPlaceholder}
                    onChange={(e) => setFormData({ ...formData, customPlaceholder: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter custom value"
                  />
                </div>

                {/* Options Management */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Predefined Options
                  </label>
                  
                  <div className="space-y-2 mb-3">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                        <span className="flex-1">{option.label}</span>
                        <span className="text-gray-600">Value: {option.value}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newOption.label}
                      onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Option label"
                    />
                    <input
                      type="number"
                      value={newOption.value}
                      onChange={(e) => setNewOption({ ...newOption, value: Number(e.target.value) })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Value"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowCustom}
                        onChange={(e) => setFormData({ ...formData, allowCustom: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Allow Custom</span>
                    </label>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingConfig(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingConfig ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
