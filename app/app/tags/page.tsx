'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react';
import { getTags, getTagGroups, createTag, updateTag, deleteTag, createTagGroup, updateTagGroup, deleteTagGroup } from '@/lib/actions/tags';
import { toast } from 'sonner';

export default function TagsPage() {
  const { t, language } = useI18n();
  const [tagGroups, setTagGroups] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupDialog, setGroupDialog] = useState(false);
  const [tagDialog, setTagDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editingTag, setEditingTag] = useState<any>(null);

  const [groupForm, setGroupForm] = useState({
    nameEn: '',
    nameAr: '',
    color: '#3b82f6',
    icon: 'tag',
  });

  const [tagForm, setTagForm] = useState({
    groupId: '',
    nameEn: '',
    nameAr: '',
    color: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [groupsData, tagsData] = await Promise.all([
        getTagGroups(),
        getTags(),
      ]);
      setTagGroups(groupsData);
      setTags(tagsData);
    } catch (error) {
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  }

  async function handleGroupSubmit() {
    try {
      const data = {
        name: { en: groupForm.nameEn, ar: groupForm.nameAr },
        color: groupForm.color,
        icon: groupForm.icon,
      };

      if (editingGroup) {
        await updateTagGroup(editingGroup._id, data);
        toast.success(t.tags.groupUpdated);
      } else {
        await createTagGroup(data);
        toast.success(t.tags.groupCreated);
      }

      setGroupDialog(false);
      resetGroupForm();
      loadData();
    } catch (error) {
      toast.error('Failed to save group');
    }
  }

  async function handleTagSubmit() {
    try {
      const data = {
        groupId: tagForm.groupId,
        name: { en: tagForm.nameEn, ar: tagForm.nameAr },
        color: tagForm.color || undefined,
      };

      if (editingTag) {
        await updateTag(editingTag._id, data);
        toast.success(t.tags.tagUpdated);
      } else {
        await createTag(data);
        toast.success(t.tags.tagCreated);
      }

      setTagDialog(false);
      resetTagForm();
      loadData();
    } catch (error) {
      toast.error('Failed to save tag');
    }
  }

  function resetGroupForm() {
    setGroupForm({ nameEn: '', nameAr: '', color: '#3b82f6', icon: 'tag' });
    setEditingGroup(null);
  }

  function resetTagForm() {
    setTagForm({ groupId: '', nameEn: '', nameAr: '', color: '' });
    setEditingTag(null);
  }

  function editGroup(group: any) {
    setEditingGroup(group);
    setGroupForm({
      nameEn: group.name.en,
      nameAr: group.name.ar,
      color: group.color,
      icon: group.icon,
    });
    setGroupDialog(true);
  }

  function editTag(tag: any) {
    setEditingTag(tag);
    setTagForm({
      groupId: tag.groupId._id || tag.groupId,
      nameEn: tag.name.en,
      nameAr: tag.name.ar,
      color: tag.color || '',
    });
    setTagDialog(true);
  }

  async function handleDeleteGroup(id: string) {
    if (confirm('This will delete all tags in this group. Continue?')) {
      try {
        await deleteTagGroup(id);
        toast.success(t.tags.groupDeleted);
        loadData();
      } catch (error) {
        toast.error('Failed to delete group');
      }
    }
  }

  async function handleDeleteTag(id: string) {
    if (confirm('Are you sure?')) {
      try {
        await deleteTag(id);
        toast.success(t.tags.tagDeleted);
        loadData();
      } catch (error) {
        toast.error('Failed to delete tag');
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.tags.title}</h1>
        <div className="flex gap-2">
          <Button onClick={() => { resetGroupForm(); setGroupDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            {t.tags.newGroup}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {tagGroups.map((group) => (
          <Card key={group._id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: group.color + '20' }}
                >
                  <TagIcon className="w-5 h-5" style={{ color: group.color }} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {group.name[language]}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {tags.filter((t) => t.groupId._id === group._id || t.groupId === group._id).length} tags
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  resetTagForm();
                  setTagForm({ ...tagForm, groupId: group._id });
                  setTagDialog(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t.tags.newTag}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => editGroup(group)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteGroup(group._id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags
                .filter((t) => t.groupId._id === group._id || t.groupId === group._id)
                .map((tag) => (
                  <div
                    key={tag._id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <span className="text-sm font-medium">{tag.name[language]}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editTag(tag)}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag._id)}
                        className="text-slate-600 dark:text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {tags.filter((t) => t.groupId._id === group._id || t.groupId === group._id).length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-500">{t.tags.noTags}</p>
            )}
          </Card>
        ))}

        {tagGroups.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <p className="text-slate-600 dark:text-slate-400">{t.tags.noGroups}</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
              {t.tags.createFirstGroup}
            </p>
          </Card>
        )}
      </div>

      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? t.common.edit : t.tags.newGroup}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.tags.groupName} (English)</Label>
              <Input
                value={groupForm.nameEn}
                onChange={(e) => setGroupForm({ ...groupForm, nameEn: e.target.value })}
                placeholder="Work"
              />
            </div>
            <div>
              <Label>{t.tags.groupName} (Arabic)</Label>
              <Input
                value={groupForm.nameAr}
                onChange={(e) => setGroupForm({ ...groupForm, nameAr: e.target.value })}
                placeholder="عمل"
              />
            </div>
            <div>
              <Label>{t.tags.color}</Label>
              <Input
                type="color"
                value={groupForm.color}
                onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <Button onClick={handleGroupSubmit} className="flex-1">
                {t.common.save}
              </Button>
              <Button variant="outline" onClick={() => setGroupDialog(false)}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tagDialog} onOpenChange={setTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? t.common.edit : t.tags.newTag}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.tags.tagName} (English)</Label>
              <Input
                value={tagForm.nameEn}
                onChange={(e) => setTagForm({ ...tagForm, nameEn: e.target.value })}
                placeholder="Meeting"
              />
            </div>
            <div>
              <Label>{t.tags.tagName} (Arabic)</Label>
              <Input
                value={tagForm.nameAr}
                onChange={(e) => setTagForm({ ...tagForm, nameAr: e.target.value })}
                placeholder="اجتماع"
              />
            </div>
            <div className="flex gap-4">
              <Button onClick={handleTagSubmit} className="flex-1">
                {t.common.save}
              </Button>
              <Button variant="outline" onClick={() => setTagDialog(false)}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
