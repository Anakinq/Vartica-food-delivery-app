import React, { useEffect, useState } from 'react';
import { LogOut, Plus, Edit2, ToggleLeft, ToggleRight, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, MenuItem, Cafeteria } from '../../lib/supabase';
import { MenuItemForm } from '../shared/MenuItemForm';
import { seedCafeteriaMenu } from '../../utils/cafeteriaMenuSeeder';

const uploadImage = async (file: File): Promise<string | null> => {
  try {
    console.log('Uploading file:', file.name);

    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(`${Date.now()}-${file.name}`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    console.log('Upload successful:', data);

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(data.path);

    console.log('Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Unexpected error during upload:', error);
    return null;
  }
};

export const CafeteriaDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [cafeteria, setCafeteria] = useState<Cafeteria | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedingMenu, setSeedingMenu] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    const { data: cafeteriaData } = await supabase
      .from('cafeterias')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (cafeteriaData) {
      setCafeteria(cafeteriaData);

      const { data: items } = await supabase
        .from('menu_items')
        .select('*')
        .eq('seller_id', cafeteriaData.id)
        .eq('seller_type', 'cafeteria')
        .order('name');

      if (items) setMenuItems(items);
    }

    setLoading(false);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);

    if (!error) {
      setMenuItems(menuItems.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    }
  };

  const handleSaveItem = async (itemData: Partial<MenuItem>, file?: File) => {
    if (!cafeteria) return;

    let finalData = { ...itemData };

    if (file) {
      const imageUrl = await uploadImage(file);
      if (imageUrl) {
        finalData = { ...finalData, image_url: imageUrl };
      } else {
        // Handle upload failure
        console.error('Failed to upload image');
        // You might want to show an error message to the user here
      }
    }

    if (editingItem) {
      const { error: menuItemError } = await supabase
        .from('menu_items')
        .update(finalData)
        .eq('id', editingItem.id);

      if (menuItemError) {
        console.error('Error updating menu item:', menuItemError);
        // You might want to show an error message to the user here
        return;
      }

      await fetchData();
      setShowForm(false);
      setEditingItem(null);
    } else {
      const { error: insertError } = await supabase
        .from('menu_items')
        .insert({
          ...finalData,
          seller_id: cafeteria.id,
          seller_type: 'cafeteria',
        });

      if (insertError) {
        console.error('Error inserting menu item:', insertError);
        // You might want to show an error message to the user here
        return;
      }

      await fetchData();
      setShowForm(false);
    }
  };

  const handleSeedMenu = async () => {
    if (!cafeteria) return;

    setSeedingMenu(true);
    try {
      const result = await seedCafeteriaMenu(cafeteria.id);
      if (result.success) {
        await fetchData(); // Refresh the menu items
        alert(result.message);
      } else {
        alert('Error seeding menu: ' + result.message);
      }
    } catch (error) {
      console.error('Error seeding menu:', error);
      alert('Error seeding menu: ' + (error as Error).message);
    } finally {
      setSeedingMenu(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!cafeteria) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Cafeteria Found</h2>
          <p className="text-gray-600">Your account is not linked to a cafeteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{cafeteria.name}</h1>
              <p className="text-sm text-gray-600">{profile?.full_name}</p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Menu Management</h2>
          <div className="flex space-x-3">
            <button
              onClick={handleSeedMenu}
              disabled={seedingMenu}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-70"
            >
              <Upload className="h-5 w-5" />
              <span>{seedingMenu ? 'Seeding...' : 'Seed Menu'}</span>
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {menuItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-gray-600 text-lg mb-4">No menu items yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Add your first item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map(item => (
              <div key={item.id} className={`bg-white rounded-xl shadow-md p-6 ${!item.is_available ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                    <p className="text-xl font-bold text-blue-600 mt-1">#{item.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`p-2 rounded-lg ${item.is_available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {item.is_available ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                )}

                {item.category && (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full mb-3">
                    {item.category}
                  </span>
                )}

                {item.image_url && (
                  <div className="mt-2 mb-3">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <span className={`text-sm font-medium ${item.is_available ? 'text-green-600' : 'text-red-600'}`}>
                    {item.is_available ? 'In Stock' : 'Out of Stock'}
                  </span>
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setShowForm(true);
                    }}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <MenuItemForm
          item={editingItem}
          onSave={handleSaveItem} // Now passes imageFile as 2nd arg
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};