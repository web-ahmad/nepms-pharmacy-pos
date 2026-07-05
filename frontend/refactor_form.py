import re

def rewrite_jsx():
    with open('src/features/inventory/components/MedicineMasterWizard/SimpleFormLayout.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find where the return statement starts
    match = re.search(r'return\s*\(\s*<div', content)
    if not match:
        print("Could not find return statement")
        return
    
    pre_return = content[:match.start()]
    
    new_jsx = """return (
    <div className="w-full max-w-5xl mx-auto pb-8">
      {/* BEGIN: PageHeading */}
      <div className="flex justify-between items-end mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{isEdit ? 'Edit Medicine' : 'Add New Medicine'}</h1>
          <p className="text-slate-500 mt-1">Configure medicine profile, pricing, and stock settings.</p>
        </div>
        <button 
          type="button" 
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-slate-600 rounded-custom hover:bg-slate-50 transition-all font-medium text-sm"
        >
          <Settings2 className="w-4 h-4" />
          Form Settings
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 p-4 bg-white border border-outline-variant rounded-custom shadow-sm animate-fade-in">
          <h4 className="font-semibold mb-3 text-sm text-slate-800">Toggle Fields</h4>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded text-emerald-deep focus:ring-emerald-500" checked={settings.showGenericName} onChange={(e) => setSettings(s => ({ ...s, showGenericName: e.target.checked }))} />
              Generic Name
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded text-emerald-deep focus:ring-emerald-500" checked={settings.showBrandName} onChange={(e) => setSettings(s => ({ ...s, showBrandName: e.target.checked }))} />
              Brand Name
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded text-emerald-deep focus:ring-emerald-500" checked={settings.showFormula} onChange={(e) => setSettings(s => ({ ...s, showFormula: e.target.checked }))} />
              Formula
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded text-emerald-deep focus:ring-emerald-500" checked={settings.showDescription} onChange={(e) => setSettings(s => ({ ...s, showDescription: e.target.checked }))} />
              Description
            </label>
          </div>
        </div>
      )}
      {/* END: PageHeading */}

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
          
          {/* Section 1: Basic Information */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-1">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">1</span>
                Basic Information
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Medicine Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  {...register('name')}
                  placeholder="e.g., Amoxicillin 250mg" 
                  className={`w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all ${errors.name ? 'border-red-500' : ''}`}
                />
              </div>
              
              {settings.showGenericName && (
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Generic Name</label>
                  <Controller
                    control={control}
                    name="generic_name"
                    render={({ field }) => (
                      <CreatableMasterDataSelect
                        masterType="generics"
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Select Generic"
                      />
                    )}
                  />
                </div>
              )}

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <CreatableMasterDataSelect
                      masterType="categories"
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select Category"
                    />
                  )}
                />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Manufacturer <span className="text-red-500">*</span></label>
                <Controller
                  control={control}
                  name="manufacturer"
                  render={({ field }) => (
                    <CreatableMasterDataSelect
                      masterType="manufacturers"
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select Manufacturer"
                    />
                  )}
                />
              </div>

              {settings.showBrandName && (
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input 
                    type="text" 
                    {...register('brand_name')}
                    placeholder="e.g., Augmentin" 
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              )}

              {settings.showFormula && (
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Formula</label>
                  <input 
                    type="text" 
                    {...register('formula')}
                    placeholder="e.g., Amoxicillin 250mg + Clavulanic Acid" 
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              )}

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Barcode</label>
                <div className="relative">
                  <input 
                    type="text" 
                    {...register('barcode')}
                    placeholder="Scan or Enter Barcode" 
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Barcode className="w-5 h-5 text-emerald-deep" />
                  </div>
                </div>
              </div>

              {settings.showDescription && (
                <div className="col-span-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Description / Notes</label>
                  <textarea 
                    {...register('description')}
                    rows={2}
                    placeholder="Additional details..." 
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Packaging & Location */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-2">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">2</span>
                Packaging & Location
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Packaging Type <span className="text-red-500">*</span></label>
                  <select 
                    {...register('packaging_type')}
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  >
                    <option value="Tablet / Capsule">Tablet / Capsule</option>
                    <option value="Syrup / Suspension">Syrup / Suspension</option>
                    <option value="Injection (Ampule / Vial)">Injection (Ampule / Vial)</option>
                    <option value="Cream / Ointment / Gel">Cream / Ointment / Gel</option>
                    <option value="Drops (Eye / Ear / Oral)">Drops (Eye / Ear / Oral)</option>
                    <option value="Inhaler / Spray">Inhaler / Spray</option>
                    <option value="Powder / Sachet">Powder / Sachet</option>
                    <option value="Suppository / Enema">Suppository / Enema</option>
                    <option value="Surgical / Dressing (Bandage, Gauze, Tape)">Surgical / Dressing</option>
                    <option value="Medical Device / Equipment (BP Monitor, Thermometer)">Medical Device / Equipment</option>
                    <option value="General Item (FMCG / Baby Care / Cosmetics)">General Item</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{field1Label} <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    min="1"
                    {...register('strips_per_box', { valueAsNumber: true })}
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                {showField2 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{field2Label} <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      min="1"
                      {...register('units_per_strip', { valueAsNumber: true })}
                      className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Shelf / Rack Location</label>
                  <input 
                    type="text" 
                    {...register('shelf')}
                    placeholder="e.g., A-12, Rack 3" 
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              
              <div className="bg-mint-soft/50 p-4 rounded-custom border border-mint-bright/30 flex items-center gap-4">
                <div className="bg-emerald-deep p-2 rounded-lg text-white">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-deep uppercase tracking-wider">Total Base Units (Calculated)</p>
                  <p className="text-xl font-bold text-slate-900">{totalBaseUnits} <span className="text-slate-500 text-sm font-normal">{baseUnitSuffix}</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Dynamic Pricing Setup */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-3">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">3</span>
                Dynamic Pricing Setup
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Purchase Price (Full Pack) <span className="text-red-500">*</span></label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-outline-variant px-3 py-2 rounded-l-custom text-slate-500 text-sm font-bold">Rs</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    {...register('purchase_price', { valueAsNumber: true })}
                    className="w-full border-outline-variant rounded-r-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1">Unit Cost (Auto)</label>
                <div className="flex items-center opacity-60">
                  <span className="bg-slate-100 border border-r-0 border-outline-variant px-3 py-2 rounded-l-custom text-slate-500 text-sm font-bold">Rs</span>
                  <input 
                    type="text" 
                    value={unitCost.toFixed(4)}
                    disabled 
                    className="w-full bg-slate-50 border-outline-variant rounded-r-custom text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Margin (%)</label>
                <div className="flex items-center">
                  <input 
                    type="number" 
                    step="0.1"
                    {...register('margin_percent', { valueAsNumber: true })}
                    className="w-full border-outline-variant rounded-l-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <span className="bg-slate-100 border border-l-0 border-outline-variant px-3 py-2 rounded-r-custom text-slate-500 text-sm font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Unit Sale Price <span className="text-red-500">*</span></label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-outline-variant px-3 py-2 rounded-l-custom text-slate-500 text-sm font-bold">Rs</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    {...register('unit_sale_price', { valueAsNumber: true })}
                    className="w-full border-outline-variant rounded-r-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold text-emerald-deep"
                  />
                </div>
              </div>
              
              <div className="md:col-span-4">
                <div className="bg-slate-50 p-3 rounded-custom inline-block border border-dashed border-outline-variant">
                  <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-tighter">Full Pack Sale Price (Auto)</p>
                  <p className="text-lg font-bold text-slate-800">Rs {fullPackSalePrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Specifications & Taxes */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-4">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">4</span>
                Specifications & Taxes
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Strength / Specification</label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    {...register('strength')}
                    placeholder={strengthPlaceholder} 
                    className="w-full border-outline-variant rounded-l-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  {strengthSuffix && (
                    <span className="bg-slate-100 border border-l-0 border-outline-variant px-2 py-2 rounded-r-custom text-slate-400 text-[10px] uppercase font-bold">
                      {strengthSuffix}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Max Retail Price (MRP)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  {...register('mrp', { valueAsNumber: true })}
                  className={`w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all ${errors.mrp ? 'border-red-500' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tax Rate (%)</label>
                <input 
                  type="number" 
                  min="0"
                  {...register('tax_rate', { valueAsNumber: true })}
                  className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 text-red-600">Low Stock Alert Level</label>
                <input 
                  type="number" 
                  min="0"
                  {...register('min_stock_level', { valueAsNumber: true })}
                  className="w-full border-red-200 bg-red-50/30 rounded-custom focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>
            </div>
          </section>

          {/* Section 5: Opening Stock & Batch Details */}
          {!isEdit && (
            <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-5">
              <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
                <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                  <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">5</span>
                  Opening Stock & Batch Details
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Opening Stock Qty</label>
                  <input 
                    type="number" 
                    min="0"
                    {...register('opening_stock', { valueAsNumber: true })}
                    placeholder="0" 
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Batch Number</label>
                  <input 
                    type="text" 
                    {...register('batch_number')}
                    placeholder="e.g., BATCH-001" 
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mfg Date</label>
                  <input 
                    type="date" 
                    {...register('manufacturing_date')}
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input 
                    type="date" 
                    {...register('expiry_date')}
                    className="w-full border-outline-variant rounded-custom focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-600"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section 6: Settings & Control */}
          <section className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden animate-fade-in delay-6">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-outline-variant">
              <h3 className="text-emerald-deep font-bold flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-deep text-white text-xs flex items-center justify-center rounded-full">{isEdit ? '5' : '6'}</span>
                Settings & Control
              </h3>
            </div>
            <div className="p-6 flex flex-wrap gap-12">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  {...register('is_active')}
                  className="w-5 h-5 rounded text-emerald-deep focus:ring-emerald-500 transition-all"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-deep transition-colors">Active (Available for Sale)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  {...register('narcotic')}
                  className="w-5 h-5 rounded text-red-500 border-red-200 focus:ring-red-500 transition-all"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-red-600 transition-colors">Controlled Substance (Narcotic)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  {...register('is_antibiotic')}
                  className="w-5 h-5 rounded text-blue-500 border-blue-200 focus:ring-blue-500 transition-all"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Antibiotic</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  {...register('rx_required')}
                  className="w-5 h-5 rounded text-yellow-500 border-yellow-200 focus:ring-yellow-500 transition-all"
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-yellow-600 transition-colors">Prescription Required</span>
              </label>
            </div>
          </section>

          {/* Form Footer Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-outline-variant animate-fade-in delay-6">
            <button 
              type="button" 
              onClick={() => router.push('/inventory/medicines')}
              className="px-8 py-3 text-slate-600 font-bold hover:text-slate-900 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={createMedicineMutation.isPending || updateMedicineMutation.isPending}
              className="px-12 py-3 bg-emerald hover:bg-emerald-deep text-white font-bold rounded-custom shadow-lg shadow-emerald/20 transition-all active:scale-95 flex items-center gap-2"
            >
              {(createMedicineMutation.isPending || updateMedicineMutation.isPending) ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isEdit ? 'Update Medicine' : 'Save Medicine'}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
"""
    
    with open('src/features/inventory/components/MedicineMasterWizard/SimpleFormLayout.tsx', 'w', encoding='utf-8') as f:
        f.write(pre_return + new_jsx)

    print("Successfully refactored SimpleFormLayout JSX")

rewrite_jsx()
