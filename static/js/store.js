(function(){
  const apiUrl = apiProductsUrl;
  const defaultImage = defaultProductImage;

  const productsContainer = document.getElementById('productsContainer');
  const paginationDiv = document.getElementById('pagination');
  const resultsCount = document.getElementById('resultsCount');
  const activeFilters = document.getElementById('activeFilters');
  
  // عناصر فیلتر موبایل
  const filterToggle = document.getElementById('filterToggle');
  const filterSectionMobile = document.getElementById('filterSectionMobile');
  const filterOverlay = document.getElementById('filterOverlay');
  const closeFilterMobile = document.getElementById('closeFilterMobile');

  // عناصر فیلتر دسکتاپ
  const resetBtnDesktop = document.getElementById('resetFiltersBtnDesktop');
  const priceRangeDesktop = document.getElementById('priceRangeDesktop');
  const displayMaxPriceDesktop = document.getElementById('displayMaxPriceDesktop');
  const displayMinPriceDesktop = document.getElementById('displayMinPriceDesktop');
  const maxPriceInputDesktop = document.getElementById('maxPriceInputDesktop');
  const minPriceInputDesktop = document.getElementById('minPriceInputDesktop');
  const inStockCheckboxDesktop = document.getElementById('inStockCheckboxDesktop');
  const sortSelect = document.getElementById('sortSelect');

  let currentPage = 1;
  let totalResults = 0;
  let debounceTimer;

  // مدیریت فیلتر موبایل
  function initMobileFilter() {
    if (filterToggle && filterSectionMobile && filterOverlay) {
      filterToggle.addEventListener('click', openFilterMobile);
      closeFilterMobile.addEventListener('click', closeFilterMobilePanel);
      filterOverlay.addEventListener('click', closeFilterMobilePanel);
      
      // بستن با دکمه ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeFilterMobilePanel();
        }
      });
    }
  }

  function openFilterMobile() {
    filterSectionMobile.classList.remove('translate-x-full');
    filterOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeFilterMobilePanel() {
    filterSectionMobile.classList.add('translate-x-full');
    filterOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function truncateWords(text, wordLimit){
    const words = text.split(/\s+/);
    return words.length <= wordLimit ? text : words.slice(0, wordLimit).join(' ') + '...';
  }

  function formatFa(n){
    return new Intl.NumberFormat('fa-IR').format(n);
  }

  function updatePriceDisplay(){
    // آپدیت نمایش قیمت برای دسکتاپ
    if (displayMinPriceDesktop && displayMaxPriceDesktop) {
      displayMinPriceDesktop.textContent = formatFa(minPriceInputDesktop.value) + ' تومان';
      displayMaxPriceDesktop.textContent = formatFa(maxPriceInputDesktop.value) + ' تومان';
    }
  }

  // مقداردهی اولیه نمایش قیمت
  updatePriceDisplay();

  function buildParams(page=1){
    const obj = { page: page, per_page: 12 };
    const qInput = new URLSearchParams(window.location.search).get('q');
    if(qInput) obj.q = qInput;

    // جمع‌آوری فیلترها از نسخه دسکتاپ
    const catVals = Array.from(document.querySelectorAll('.filter-category-desktop:checked')).map(cb=>cb.value);
    if(catVals.length) obj.categories = catVals.join(',');
    
    const brandVals = Array.from(document.querySelectorAll('.filter-brand-desktop:checked')).map(cb=>cb.value);
    if(brandVals.length) obj.brands = brandVals.join(',');

    obj.min_price = minPriceInputDesktop.value;
    obj.max_price = maxPriceInputDesktop.value;
    
    if(inStockCheckboxDesktop.checked) obj.in_stock = '1';
    if(sortSelect.value) obj.sort = sortSelect.value;

    return obj;
  }

  function stripHtml(html){
    return html
      .replace(/<br\s*\/?>/gi, '\n ')
      .replace(/<\/p>/gi, '\n ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);

    // دسته‌ها - اعمال روی چک‌باکس‌های دسکتاپ
    const cats = params.get('categories');
    if (cats) {
        cats.split(',').forEach(id => {
            const el = document.querySelector(`.filter-category-desktop[value="${id}"]`);
            if (el) el.checked = true;
        });
    }

    // برندها - اعمال روی چک‌باکس‌های دسکتاپ
    const brands = params.get('brands');
    if (brands) {
        brands.split(',').forEach(id => {
            const el = document.querySelector(`.filter-brand-desktop[value="${id}"]`);
            if (el) el.checked = true;
        });
    }

    // قیمت‌ها
    const minP = params.get('min_price');
    const maxP = params.get('max_price');

    if (minP !== null) minPriceInputDesktop.value = minP;
    if (maxP !== null) {
        maxPriceInputDesktop.value = maxP;
        priceRangeDesktop.value = maxP;
    }
    updatePriceDisplay();

    // موجودی
    if (params.get('in_stock') === '1') {
        inStockCheckboxDesktop.checked = true;
    }

    // مرتب‌سازی
    const sort = params.get('sort');
    if (sort) sortSelect.value = sort;
  }

  function renderActiveFilters(){
    const activeFiltersArray = [];

    document.querySelectorAll('.filter-category-desktop:checked').forEach(cb=>{
      const label = document.querySelector(`label[for="${cb.id}"]`);
      activeFiltersArray.push({type:'category', value:cb.value, text:label.textContent, id:cb.id});
    });
    
    document.querySelectorAll('.filter-brand-desktop:checked').forEach(cb=>{
      const label = document.querySelector(`label[for="${cb.id}"]`);
      activeFiltersArray.push({type:'brand', value:cb.value, text:label.textContent, id:cb.id});
    });
    
    if(maxPriceInputDesktop.value < 5000000){
      activeFiltersArray.push({type:'price', value:maxPriceInputDesktop.value, text:`تا ${formatFa(maxPriceInputDesktop.value)} تومان`, id:'price-filter'});
    }
    
    if(inStockCheckboxDesktop.checked){
      activeFiltersArray.push({type:'stock', value:'1', text:'فقط موجود', id:'stock-filter'});
    }
    
    if(sortSelect.value){
      const sortText = {
        'price_asc':'ارزان‌ترین',
        'price_desc':'گران‌ترین',
        'newest':'جدیدترین',
        'oldest':'قدیمی‌ترین'
      }[sortSelect.value];
      activeFiltersArray.push({type:'sort', value:sortSelect.value, text:`مرتب‌سازی: ${sortText}`, id:'sort-filter'});
    }

    if(activeFiltersArray.length > 0){
      activeFilters.classList.remove('hidden');
      activeFilters.innerHTML = `
        <span class="text-gray-600 text-sm">فیلترهای فعال:</span>
        ${activeFiltersArray.map(filter=>`
          <div class="active-filter-tag bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-xs flex items-center gap-2">
            ${filter.text}
            <button type="button" onclick="removeFilter('${filter.type}','${filter.id}')" class="text-emerald-500 hover:text-emerald-700 transition text-xs">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `).join('')}
        <button type="button" onclick="resetFilters()" class="text-emerald-600 hover:text-emerald-700 text-sm font-semibold whitespace-nowrap">
          حذف همه فیلترها
        </button>
      `;
    } else {
      activeFilters.classList.add('hidden');
    }
  }

  function removeFilter(type, id){
    switch(type){
      case 'category': case 'brand':
        const el = document.getElementById(id);
        if (el) el.checked = false;
        break;
      case 'price':
        priceRangeDesktop.value = 5000000;
        maxPriceInputDesktop.value = 5000000;
        minPriceInputDesktop.value = 0;
        updatePriceDisplay();
        break;
      case 'stock':
        inStockCheckboxDesktop.checked = false;
        break;
      case 'sort':
        sortSelect.value = '';
        break;
    }
    loadProducts(1, true);
  }

  function renderProducts(products){
    productsContainer.innerHTML = '';
    if(!products.length){
      productsContainer.innerHTML = `
        <div class="col-span-full text-center py-8 md:py-12">
          <i class="fas fa-search text-3xl md:text-4xl text-gray-300 mb-3 md:mb-4"></i>
          <p class="text-gray-500 text-base md:text-lg mb-3">هیچ محصولی مطابق با فیلترهای شما یافت نشد.</p>
          <button onclick="resetFilters()" class="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition font-semibold">
            حذف همه فیلترها
          </button>
        </div>
      `;
      return;
    }

    products.forEach(p=>{
      const productDiv = document.createElement('div');
      productDiv.className = 'group relative w-full';
      const imageUrl = p.image ? p.image : defaultImage;
      const description = p.description 
        ? truncateWords(p.description.replace(/<\/?[^>]+>/g, ''), 8)
        : 'توضیحات موجود نیست';
      const discountPercent = p.discount_price ? Math.round((1 - p.discount_price / p.price) * 100) : 0;

      productDiv.innerHTML = `
        <a href="/product/${p.id}/${p.slug}/" class="block">
          <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 product-card h-full flex flex-col" data-id="${p.id}">
            <div class="relative bg-gray-50 flex items-center justify-center p-3 h-48 sm:h-56 md:h-64">
              <img src="${imageUrl}" alt="${stripHtml(p.name)}" class="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105">
              ${discountPercent > 0 ? `<div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">${discountPercent}% تخفیف</div>` : ''}
              <div class="absolute top-2 right-2">
                ${p.inventory > 0 ? `<span class="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">موجود</span>` : `<span class="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">ناموجود</span>`}
              </div>
            </div>
            <div class="p-3 md:p-4 flex-1 flex flex-col">
              <h3 class="text-base md:text-lg font-bold text-gray-800 mb-2 leading-relaxed line-clamp-2">${truncateWords(stripHtml(p.name), 5)}</h3>
              <p class="text-gray-600 text-xs md:text-sm mb-3 flex-1 leading-relaxed line-clamp-3">${description}</p>
              <div class="mt-auto">
                ${p.discount_price ? `<div class="flex items-center gap-2 mb-2 flex-wrap"><span class="text-base md:text-lg font-bold text-emerald-600">${formatFa(p.discount_price)} تومان</span><span class="text-xs md:text-sm text-gray-500 line-through">${formatFa(p.price)}</span></div>` : `<span class="text-base md:text-lg font-bold text-emerald-600 mb-2 block">${formatFa(p.price)} تومان</span>`}
                <div class="flex justify-between items-center gap-2">
                  <button class="add-to-cart-btn bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition duration-300 flex items-center text-xs md:text-sm font-semibold flex-1 justify-center" data-product-id="${p.id}">
                    <i class="fas fa-cart-plus ml-1 md:ml-2"></i>
                    <span class="whitespace-nowrap">افزودن به سبد</span>
                  </button>
                  <div class="flex items-center text-amber-500 text-xs md:text-sm">
                    <i class="fas fa-star ml-1"></i>
                    <span>4.8</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a>
      `;
      productsContainer.appendChild(productDiv);
    });

    document.querySelectorAll('.add-to-cart-btn').forEach(btn=>{
      btn.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        addToCart(this.getAttribute('data-product-id'));
      });
    });
  }

  function addToCart(productId){
    const btn = document.querySelector(`[data-product-id="${productId}"]`);
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check ml-2"></i> افزوده شد';
    btn.classList.replace('bg-emerald-600','bg-green-600');
    btn.disabled = true;
    setTimeout(()=>{ 
      btn.innerHTML = originalHTML; 
      btn.classList.replace('bg-green-600','bg-emerald-600');
      btn.disabled = false;
    },2000);
  }

  function renderPagination(pagination){
    paginationDiv.innerHTML = '';
    if(!pagination || pagination.total_pages <= 1) return;
    
    const createBtn = (text, page, disabled=false, active=false)=>{
      const btn = document.createElement('button');
      btn.className = 'px-3 py-2 rounded-lg border transition duration-300 font-medium text-sm min-w-[40px]';
      if(disabled) btn.className += ' opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200';
      else if(active) btn.className += ' bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700';
      else btn.className += ' bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400';
      btn.textContent = text;
      if(!disabled) btn.addEventListener('click', ()=>loadProducts(page,true));
      return btn;
    };
    
    paginationDiv.appendChild(createBtn('‹ قبلی', pagination.page-1, !pagination.has_prev));
    
    const total = pagination.total_pages, current = pagination.page;
    let startPage = Math.max(1,current-2), endPage = Math.min(total,current+2);
    if(current <=3) endPage = Math.min(5,total);
    if(current >= total-2) startPage = Math.max(1,total-4);
    
    for(let i=startPage;i<=endPage;i++) {
      paginationDiv.appendChild(createBtn(i,i,false,i===current));
    }
    
    paginationDiv.appendChild(createBtn('بعدی ›', pagination.page+1,!pagination.has_next));
  }

  async function loadProducts(page=1,pushState=false){
    currentPage = page;
    const paramsObj = buildParams(page);
    
    try{
      productsContainer.innerHTML = `
        <div class="col-span-full text-center py-8 md:py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-emerald-600"></div>
          <p class="text-gray-600 mt-3 md:mt-4 text-sm md:text-base">در حال بارگذاری محصولات...</p>
        </div>
      `;
      
      const qs = new URLSearchParams(paramsObj).toString();
      const url = apiUrl + '?' + qs;
      
      const res = await fetch(url, { 
        headers: {'Accept':'application/json'}, 
        credentials: 'same-origin'
      });
      
      if(!res.ok) throw new Error('خطا در دریافت اطلاعات');
      const data = await res.json();
      totalResults = data.count || data.results.length;
      
      renderProducts(data.results || []);
      renderPagination(data.pagination || {});
      renderActiveFilters();
      resultsCount.textContent = formatFa(totalResults);
      
      if(pushState) {
        history.pushState(null, '', storePageUrl + '?' + qs);
      }
      
    }catch(err){
      console.error(err);
      productsContainer.innerHTML = `
        <div class="col-span-full text-center py-8 md:py-12">
          <i class="fas fa-exclamation-triangle text-3xl md:text-4xl text-red-400 mb-3 md:mb-4"></i>
          <p class="text-red-600 mb-3 text-sm md:text-base">خطا در بارگذاری محصولات</p>
          <button onclick="loadProducts(1,false)" class="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition font-semibold">
            تلاش مجدد
          </button>
        </div>
      `;
    }
  }

  function resetFilters(){
    // ریست همه چک‌باکس‌های دسکتاپ
    document.querySelectorAll('.filter-category-desktop, .filter-brand-desktop').forEach(cb=>cb.checked=false);
    inStockCheckboxDesktop.checked = false;
    priceRangeDesktop.value = 5000000;
    maxPriceInputDesktop.value = 5000000;
    minPriceInputDesktop.value = 0;
    sortSelect.value = '';
    updatePriceDisplay();
    loadProducts(1,true);
  }

  function debounce(func, wait){
    return function(...args){
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(()=>func(...args), wait);
    };
  }

  // Event Listeners برای فیلترهای دسکتاپ
  function initDesktopFilters() {
    document.querySelectorAll('.filter-category-desktop, .filter-brand-desktop').forEach(cb=>{
      cb.addEventListener('change', debounce(()=>loadProducts(1,true),300));
    });
    
    inStockCheckboxDesktop.addEventListener('change', debounce(()=>loadProducts(1,true),300));
    sortSelect.addEventListener('change', debounce(()=>loadProducts(1,true),300));
    
    if (priceRangeDesktop) {
      priceRangeDesktop.addEventListener('input', ()=>{ 
        maxPriceInputDesktop.value = priceRangeDesktop.value; 
        updatePriceDisplay(); 
        loadProducts(1,true); 
      });
    }
    
    if (resetBtnDesktop) {
      resetBtnDesktop.addEventListener('click', resetFilters);
    }
  }

  // Initialize
  initMobileFilter();
  initDesktopFilters();
  applyUrlFilters();
  loadProducts(1,false);

  window.addEventListener('popstate', ()=>{ 
    const page = parseInt(new URLSearchParams(window.location.search).get('page')||'1'); 
    loadProducts(page,false); 
  });

  window.removeFilter = removeFilter;
  window.resetFilters = resetFilters;

})();