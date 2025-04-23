/* mother/admin/modules/databaseManager/placeholders/mongoPlaceholders.js
// Handles MongoDB-specific placeholders for the database manager module.
*/

const { ObjectId } = require('mongodb');
const notificationEmitter = require('../../../emitters/notificationEmitter');



async function handleBuiltInPlaceholderMongo(db, operation, params) {
  switch (operation) {
    
    // ─────────────────────────────────────────────────────────────────────────
    // USER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────
    case 'INIT_USER_MANAGEMENT': {
        // Create collections if they do not exist
        await db.createCollection('users').catch(() => {});
        await db.createCollection('roles').catch(() => {});
        await db.createCollection('user_roles').catch(() => {});
      
        // unique indexes for "users"
        await db.collection('users').createIndex({ username: 1 }, { unique: true }).catch(() => {});
        await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true }).catch(() => {});
        // user_roles => unique index on (user_id, role_id)
        await db.collection('user_roles').createIndex({ user_id: 1, role_id: 1 }, { unique: true }).catch(() => {});
      
        // Add some default fields if they're missing
        await db.collection('users').updateMany({}, {
          $set: {
            email: '',
            first_name: '',
            last_name: '',
            display_name: '',
            phone: '',
            company: '',
            website: '',
            avatar_url: '',
            bio: '',
            token_version: 0,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      
        // Create index for "roles" and update to default fields
        await db.collection('roles').createIndex({ role_name: 1 }, { unique: true }).catch(() => {});
        await db.collection('roles').updateMany({}, {
          $set: {
            is_system_role: false,
            description: '',
            permissions: {},
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      
        // same for user_roles => just ensure created_at, updated_at
        await db.collection('user_roles').updateMany({}, {
          $set: {
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      
        return { done: true };
      }
      
      case 'INIT_B2B_FIELDS': {
        // For example, add 'company_name' & 'vat_number' as needed
        await db.collection('users').updateMany({}, {
          $set: {
            company_name: '',
            vat_number: ''
          }
        });
        return { done: true };
      }
      
      case 'ADD_USER_FIELD': {
        // expects fieldName, fieldType
        // In Mongo, we don't need a schema-based approach — just set it to null
        const fieldName = (params && params.fieldName) || 'extra_field';
      
        await db.collection('users').updateMany({}, {
          $set: {
            [fieldName]: null
          }
        });
        return { done: true };
      }

    // ─────────────────────────────────────────────────────────────────────────
    // SETTINGS MANAGER
    // ─────────────────────────────────────────────────────────────────────────
    case 'INIT_SETTINGS_SCHEMA': {
    return { done: true };
    }

    case 'INIT_SETTINGS_TABLES': {
    await db.createCollection('cms_settings').catch(() => {});
    await db.createCollection('module_events').catch(() => {});
    
    // Eindeutige Indizes erstellen:
    await db.collection('cms_settings').createIndex({ key: 1 }, { unique: true }).catch(() => {});
    
    return { done: true };
    }

    case 'CHECK_AND_ALTER_SETTINGS_TABLES': {
    await db.collection('cms_settings').updateMany(
        { something_else: { $exists: false } },
        { $set: { something_else: null } }
        );
        
        return { done: true };
        }

    case 'GET_SETTING': {
    const theKey = params && params[0];
    if (!theKey) return [];
    const doc = await db.collection('cms_settings').findOne({ key: theKey });
    return doc ? [doc] : [];
    }

    case 'UPSERT_SETTING': {
    const settingKey = params && params[0];
    const settingVal = params && params[1];
    await db.collection('cms_settings').updateOne(
        { key: settingKey },
        {
        $set: {
            value: settingVal,
            updated_at: new Date()
        },
        $setOnInsert: {
            created_at: new Date()
        }
        },
        { upsert: true }
    );
    return { done: true };
    }

    case 'GET_ALL_SETTINGS': {
    const docs = await db.collection('cms_settings').find({}).toArray();
    return docs;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAGES MODULE
    // ─────────────────────────────────────────────────────────────────────────
    case 'INIT_PAGES_SCHEMA': {
    // Create the 'pages' and 'page_translations' collections
    await db.createCollection('pages').catch(() => {});
    await db.createCollection('page_translations').catch(() => {});
    return { done: true };
    }
    
    case 'INIT_PAGES_TABLE': {
    // Create unique indexes if needed
    await db.collection('pages').createIndex({ slug: 1 }, { unique: true });
    await db.collection('page_translations').createIndex({ page_id: 1, language: 1 }, { unique: true });
    return { done: true };
    }
    
    case 'CHECK_AND_ALTER_PAGES_TABLE': {
      await db.collection('pages').updateMany(
        { language: { $exists: false } },
        { $set: { language: 'de' } }
      );
    
      // Unique‑Index (is_start + language)
      await db.collection('pages').createIndex(
        { language: 1 },
        { unique: true, partialFilterExpression: { is_start: true } }
      );
    return { done: true };
    }
    
    case 'CREATE_PAGE': {
      const p = Array.isArray(params) ? (params[0] || {}) : (params || {});
      const { slug, status, seo_image, translations } = p;
      
      /* 1) main document*/
      const page = await db.collection('pages').insertOne({
        slug,
        status    : status || 'draft',
        seo_image : seo_image || '',
        is_start  : false,
        created_at: new Date(),
        updated_at: new Date()
      });
    
      /* 2) translations */
      const translationDocs = translations.map(t => ({
        page_id      : page.insertedId,
        language     : t.language,
        title        : t.title,
        html         : t.html,
        css          : t.css,
        meta_desc    : t.metaDesc,
        seo_title    : t.seoTitle,
        seo_keywords : t.seoKeywords,
        created_at   : new Date(),
        updated_at   : new Date()
      }));
      await db.collection('page_translations').insertMany(translationDocs);    
      return { done: true, insertedId: page.insertedId };
    }
    
    case 'GET_ALL_PAGES': {
    const allPages = await db.collection('pages').find({}).sort({ _id: -1 }).toArray();
    return allPages;
    }
    
    case 'GET_PAGE_BY_ID': {
    const pageId = params[0];
    const lang = params[1] || 'en';
    
    const page = await db.collection('pages').findOne({ _id: new ObjectId(pageId) });
    if (!page) return null;
    
    const translation = await db.collection('page_translations').findOne({
        page_id: page._id,
        language: lang
    });
    
    return { ...page, translation };
    }
    


    case 'GET_PAGE_BY_SLUG': {
    const slug = params[0];
    const lang = params[1] || 'en';
    
    const page = await db.collection('pages').findOne({ slug });
    if (!page) return null;
    
    const translation = await db.collection('page_translations').findOne({
        page_id: page._id,
        language: lang
    });
    
    return { ...page, translation };
    }
    
    case 'UPDATE_PAGE': {
    const { pageId, slug, status, seo_image, translations } = params;
    
    // 1) Update the main page
    await db.collection('pages').updateOne(
        { _id: new ObjectId(pageId) },
        { $set: { slug, status, seo_image, updated_at: new Date() } }
    );
    
    // 2) Upsert all translations
    for (const t of translations) {
        await db.collection('page_translations').updateOne(
        { page_id: new ObjectId(pageId), language: t.language },
        {
            $set: {
            title: t.title,
            html: t.html,
            css: t.css,
            meta_desc: t.metaDesc,
            seo_title: t.seoTitle,
            seo_keywords: t.seoKeywords,
            updated_at: new Date()
            }
        },
        { upsert: true }
        );
    }
    
    return { done: true };
    }
    
    case 'SET_AS_SUBPAGE': {
        const { parentPageId, childPageId } = params;
        await db.collection('pages').updateOne(
          { _id: new ObjectId(childPageId) },
          { $set: { parent_id: new ObjectId(parentPageId) } }
        );
        return { done: true };
      }

      
    case 'ASSIGN_PAGE_TO_POSTTYPE': {
        const { pageId, postTypeId } = params;
        // z.B. in "page_posttype_rel" Collection
        await db.collection('page_posttype_rel').updateOne(
          { page_id: new ObjectId(pageId), posttype_id: new ObjectId(postTypeId) },
          { $setOnInsert: { created_at: new Date() } },
          { upsert: true }
        );
    return { done: true };
    }

    case 'GET_START_PAGE': {
      // params = [ language? ]
      const lang = (Array.isArray(params) && params[0]) ? params[0].toLowerCase() : 'de';
    
      const page = await db.collection('pages').findOne({ is_start: true, language: lang });
      if (!page) return null;
    
      const translation = await db.collection('page_translations')
                                  .findOne({ page_id: page._id, language: lang });
    
      return { ...page, translation };
    }

    case 'GENERATE_XML_SITEMAP':{
    const pages = await db.collection('pages')
                        .find({ status: 'published' })
                        .project({ slug: 1, updated_at: 1, is_start:1 })
                        .sort({ _id: 1 })
                        .toArray();

         const xml = buildSitemap(pages);   
    return xml;
    }     

    case 'DELETE_PAGE': {
    const pageId = params[0];
    
    await db.collection('pages').deleteOne({ _id: new ObjectId(pageId) });
    await db.collection('page_translations').deleteMany({ page_id: new ObjectId(pageId) });
    return { done: true };
    }
    
    case 'SET_AS_START': {
      const data = params[0] || {};
      const pageId   = data.pageId;
      const language = (data.language || 'de').toLowerCase();
    
      if (!pageId) throw new Error('pageId required for SET_AS_START');
    
      await db.collection('pages').updateMany(
        { language },                 
        { $set: { is_start: false } }
      );
    
      await db.collection('pages').updateOne(
        { _id: new ObjectId(pageId) },
        {
          $set: {
            is_start: true,
            language,                  
            updated_at: new Date()
          }
        }
      );
     
      await db.collection('pages')
              .createIndex(
                { language: 1, is_start: 1 },
                { unique: true, partialFilterExpression: { is_start: true } }
              )
              .catch(() => {});       

      return { done: true };
    }   

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE LOADER
    // ─────────────────────────────────────────────────────────────────────────
    case 'DROP_MODULE_DATABASE': {
      // Expects params[0] = moduleName or collection name
      // For Mongo, you might drop the collection or do something else:
      const moduleName = params[0];
      await db.collection(moduleName).drop().catch(() => {});
      return { done: true };
    }
  
    case 'INIT_MODULE_REGISTRY_TABLE': {
      // Create module_registry collection if it doesn't exist
      await db.createCollection('module_registry').catch(() => {});
      return { done: true };
    }
  
    case 'CHECK_MODULE_REGISTRY_COLUMNS': {
      // In Mongo, there's no direct "columns" concept, so we might return indexes
      const indexes = await db.collection('module_registry').indexes();
      return indexes;
    }
  
    case 'ALTER_MODULE_REGISTRY_COLUMNS': {
      // Example: Add a field "description" to all documents if not present
      await db.collection('module_registry').updateMany(
        {},
        { $set: { description: '' } }
      );
      return { done: true };
    }
  
    case 'SELECT_MODULE_REGISTRY': {
      // Return all docs from module_registry
      const docs = await db.collection('module_registry').find({}).toArray();
      return docs;
    }
  
    case 'LIST_ACTIVE_GRAPES_MODULES': {
      // Return active modules with "grapesComponent" = true
      const docs = await db.collection('module_registry').find({
        is_active: true,
        'module_info.grapesComponent': true
      }).toArray();
      return docs;
    }

    case 'SELECT_MODULE_BY_NAME': {
      const { moduleName } = data;
      const doc = await db.collection('module_registry').findOne({
        module_name: moduleName
      });
      return doc ? [doc] : [];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEPENDENCY LOADER
    // ─────────────────────────────────────────────────────────────────────────
    case 'CHECK_DB_EXISTS_DEPENDENCYLOADER': {
      const admin = db.client?.db().admin() || db.admin();
      const { databases } = await admin.listDatabases();
      const found = databases.some((dbinfo) => dbinfo.name === 'dependencyloader_db');
      return found ? [{ name: 'dependencyloader_db' }] : [];
    }
  
    case 'INIT_DEPENDENCYLOADER_SCHEMA': {
        await db.createCollection('module_dependencies').catch(() => {});
        return { done: true };
    }
    
    case 'INIT_DEPENDENCYLOADER_TABLE': {
        await db.collection('module_dependencies').createIndex({ module_name: 1 }).catch(() => {});
        return { done: true };
    }
    
    case 'LIST_DEPENDENCYLOADER_DEPENDENCIES': {
        const docs = await db.collection('module_dependencies').find({}).toArray();
        return docs;
    }
  

    // ─────────────────────────────────────────────────────────────────────────
    // UNIFIED SETTINGS
    // ─────────────────────────────────────────────────────────────────────────
    case 'LIST_MODULE_SETTINGS': {
        const targetModule = params[0];
      
        const docs = await db.collection('cms_settings')
          .find({ key: { $regex: `^${targetModule}\\.` } })
          .toArray();
      
        return docs;
      }
      


    // ─────────────────────────────────────────────────────────────────────────
    // SERVER MANAGER
    // ─────────────────────────────────────────────────────────────────────────
    case 'INIT_SERVERMANAGER_SCHEMA': {
        await db.createCollection('server_locations').catch(() => {});
        return { done: true };
    }

    case 'SERVERMANAGER_ADD_LOCATION': {
        const data = params[0] || {};
        const { serverName, ipAddress, notes } = data;
        await db.collection('server_locations').insertOne({
        server_name: serverName,
        ip_address: ipAddress,
        notes: notes || '',
        created_at: new Date(),
        updated_at: new Date()
        });
        return { done: true };
    }

    case 'SERVERMANAGER_GET_LOCATION': {
        const data = params[0] || {};
        const { locationId } = data;

        const doc = await db.collection('server_locations').findOne({ id: locationId });
        return doc ? [doc] : [];
    }

    case 'SERVERMANAGER_LIST_LOCATIONS': {
        const docs = await db.collection('server_locations').find({}).sort({ _id: 1 }).toArray();
        return docs;
    }

    case 'SERVERMANAGER_DELETE_LOCATION': {
        const data = params[0] || {};
        const { locationId } = data;
        await db.collection('server_locations').deleteOne({ id: locationId });
        return { done: true };
    }

    case 'SERVERMANAGER_UPDATE_LOCATION': {
        const data = params[0] || {};
        const { locationId, newName, newIp, newNotes } = data;
        await db.collection('server_locations').updateOne(
        { id: locationId },
        {
            $set: {
            server_name: newName,
            ip_address: newIp,
            notes: newNotes,
            updated_at: new Date()
            }
        }
        );
        return { done: true };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MEDIA MANAGER
    // ─────────────────────────────────────────────────────────────────────────

    case 'INIT_MEDIA_SCHEMA': {
        await db.createCollection('media_files').catch(() => {});
        return { done: true };
    }
    
    case 'MEDIA_ADD_FILE': {
        const data = params[0] || {};
        const { fileName, fileType, category, userId, location, folder, notes } = data;
        await db.collection('media_files').insertOne({
        file_name : fileName,
        file_type : fileType,
        category  : category || '',
        user_id   : userId || null,
        location  : location || '',
        folder    : folder || '',
        notes     : notes || '',
        created_at: new Date(),
        updated_at: new Date()
        });
        return { done: true };
    }
    
    case 'MEDIA_LIST_FILES': {
        const data = params[0] || {};
        const { filterCategory, filterFileType } = data;
        let query = {};
        if (filterCategory) query.category  = filterCategory;
        if (filterFileType) query.file_type = filterFileType;
        const allFiles = await db.collection('media_files')
        .find(query)
        .sort({ _id: -1 })
        .toArray();
        return allFiles;
    }
    
    case 'MEDIA_DELETE_FILE': {
        const data = params[0] || {};
        const { fileId } = data;
        // If you're storing `_id` as an ObjectId, do a `new ObjectId(fileId)`.
        // But let's assume `id` is stored as a plain field:
        await db.collection('media_files').deleteOne({ id: fileId });
        return { done: true };
    }
    
    case 'MEDIA_UPDATE_FILE': {
        const data = params[0] || {};
        const { fileId, newCategory, newNotes, newFolder } = data;
        await db.collection('media_files').updateOne(
        { id: fileId },
        {
            $set: {
            category  : newCategory,
            notes     : newNotes,
            folder    : newFolder,
            updated_at: new Date()
            }
        }
        );
        return { done: true };
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // SHARE MANAGER
    // ─────────────────────────────────────────────────────────────────────────

    case 'INIT_SHARED_LINKS_TABLE': {
    await db.createCollection('shared_links').catch(() => {});
    // Possibly create an index on short_token
    await db.collection('shared_links').createIndex({ short_token: 1 }, { unique: true }).catch(() => {});
    return { done: true };
    }
    
    case 'CREATE_SHARE_LINK': {
    // meltdown bridging => params[0] = { shortToken, filePath, userId, isPublic }
    const dataObj = params[0] || {};
    const { shortToken, filePath, userId, isPublic } = dataObj;
    
    const doc = {
        short_token: shortToken,
        file_path  : filePath,
        created_by : userId,
        is_public  : (isPublic !== false),
        created_at : new Date()
    };
    
    const insertRes = await db.collection('shared_links').insertOne(doc);
    // Return inserted doc
    return insertRes.ops?.[0] || { insertedId: insertRes.insertedId };
    }
    
    case 'REVOKE_SHARE_LINK': {
    const dataObj = params[0] || {};
    const { shortToken, userId } = dataObj;
    // Either delete or set is_public=false
    await db.collection('shared_links').updateOne(
        { short_token: shortToken, created_by: userId },
        { $set: { is_public: false } }
    );
    return { done: true };
    }
    
    case 'GET_SHARE_LINK': {
    const dataObj = params[0] || {};
    const { shortToken } = dataObj;
    const doc = await db.collection('shared_links').findOne({ short_token: shortToken });
    return doc ? [doc] : [];
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // TRANSLATION MANAGER
    // ─────────────────────────────────────────────────────────────────────────
    case 'INIT_TRANSLATION_TABLES': {
    await db.createCollection('translation_usage').catch(() => {});
    await db.createCollection('translation_cache').catch(() => {});
    
    // Indexes for translation_usage
    await db.collection('translation_usage').createIndex({ user_id: 1 }).catch(() => {});
    await db.collection('translation_usage').createIndex({ created_at: -1 }).catch(() => {});
    
    // Indexes for translation_cache
    await db.collection('translation_cache').createIndex({ user_id: 1 }).catch(() => {});
    await db.collection('translation_cache').createIndex({ from_lang: 1, to_lang: 1 }).catch(() => {});
    await db.collection('translation_cache').createIndex({ source_text: 1 }).catch(() => {});
    
    console.log('[TRANSLATION] Created translation_usage & translation_cache collections and indexes in Mongo.');
    return { done: true };
    }

        // ─────────────────────────────────────────────────────────────────────────
    // WIDGET MANAGER
    // ─────────────────────────────────────────────────────────────────────────
    case 'INIT_WIDGETS_TABLE': {
    // Erstelle Collection 'widgetmanager.widgets'
    // Du kannst wahlweise "widgetmanager_widgets" nennen.
    const collectionName = 'widgetmanager_widgets';
    await db.createCollection(collectionName).catch(() => {});

    // Optional: Index auf (widget_id, widget_type) unique
    await db.collection(collectionName).createIndex(
        { widget_id: 1, widget_type: 1 },
        { unique: true }
    ).catch(() => {});

    return { done: true };
    }

    case 'CREATE_WIDGET': {
    // params[0] = { widgetId, widgetType, label, content, category }
    const data = params[0] || {};
    const {
        widgetId,
        widgetType,
        label,
        content,
        category
    } = data;

    await db.collection('widgetmanager_widgets').insertOne({
        widget_id: widgetId,
        widget_type: widgetType,
        label: label || '',
        content: content || '',
        category: category || '',
        created_at: new Date(),
        updated_at: new Date()
    });
    return { done: true };
    }

    case 'GET_WIDGETS': {
    // Optional: params[0] = { widgetType }
    const data = params[0] || {};
    const { widgetType } = data;

    const query = {};
    if (widgetType) {
        query.widget_type = widgetType;
    }

    const docs = await db.collection('widgetmanager_widgets')
        .find(query)
        .sort({ _id: 1 })
        .toArray();
    return docs;
    }

    case 'UPDATE_WIDGET': {
    // params[0] = { widgetId, widgetType, newLabel, newContent, newCategory }
    const data = params[0] || {};
    const {
        widgetId,
        widgetType,
        newLabel,
        newContent,
        newCategory
    } = data;

    await db.collection('widgetmanager_widgets').updateOne(
        { widget_id: widgetId, widget_type: widgetType },
        {
        $set: {
            label: newLabel ?? undefined,
            content: newContent ?? undefined,
            category: newCategory ?? undefined,
            updated_at: new Date()
        }
        }
    );
    return { done: true };
    }

    case 'DELETE_WIDGET': {
    // params[0] = { widgetId, widgetType }
    const data = params[0] || {};
    const { widgetId, widgetType } = data;

    await db.collection('widgetmanager_widgets').deleteOne({
        widget_id: widgetId,
        widget_type: widgetType
    });
    return { done: true };
    }

  }

  notificationEmitter.notify({
     moduleName: 'databaseManager',
     notificationType: 'debug',
     priority: 'debug',
     message: `[PLACEHOLDER][Mongo] Unrecognized built-in placeholder: "${operation}". Doing nothing...`
   });


  return { done: false };
}

module.exports = { handleBuiltInPlaceholderMongo };
