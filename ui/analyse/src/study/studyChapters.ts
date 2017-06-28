import { h } from 'snabbdom'
import { VNode } from 'snabbdom/vnode'
import { prop } from 'common';
import { bind } from '../util';
import { ctrl as chapterNewForm } from './chapterNewForm';
import { ctrl as chapterEditForm } from './chapterEditForm';
import { SocketSend } from '../interfaces';

export function ctrl(initChapters, send: SocketSend, setTab, chapterConfig, root) {

  const list = prop(initChapters);

  const newForm = chapterNewForm(send, list, setTab, root);
  const editForm = chapterEditForm(send, chapterConfig, root.redraw);

  return {
    newForm,
    editForm,
    list,
    get(id) {
      return list().find(function(c) {
        return c.id === id;
      });
    },
    size: function() {
      return list().length;
    },
    sort: function(ids) {
      send("sortChapters", ids);
    },
    firstChapterId: function() {
      return list()[0].id;
    },
    toggleNewForm: function() {
      if (newForm.vm.open || list().length < 64) newForm.toggle();
      else alert("You have reached the limit of 64 chapters per study. Please create a new study.");
    }
  };
}

export function view(ctrl) {

  const configButton = ctrl.members.canContribute() ? h('i.action.config', { attrs: { 'data-icon': '%' } }) : null;
  const current = ctrl.currentChapter();

  function update(vnode: VNode) {
    const newCount = ctrl.chapters.list().length;
    const vData = vnode.data!;
    const el = vnode.elm as HTMLElement;
    if (vData.count !== newCount) {
      if (current.id !== ctrl.chapters.firstChapterId()) {
        $(el).scrollTo($(el).find('.active'), 200);
      }
    } else if (ctrl.vm.loading && vData.loadingId !== ctrl.vm.nextChapterId) {
      vData.loadingId = ctrl.vm.nextChapterId;
      const ch = $(el).find('.loading');
      if (ch.length) $(el).scrollTo(ch, 200);
    }
    vData.count = newCount;
    if (ctrl.members.canContribute() && newCount > 1 && !vData.sortable) {
      const makeSortable = function() {
        vData.sortable = window['Sortable'].create(el, {
          draggable: '.draggable',
          onSort: function() {
            ctrl.chapters.sort(vData.sortable.toArray());
          }
        });
      }
      if (window['Sortable']) makeSortable();
      else window.lichess.loadScript('/assets/javascripts/vendor/Sortable.min.js').done(makeSortable);
    }
  }

  return [
    h('div.list.chapters', {
      hook: {
        insert: vnode => {
          (vnode.elm as HTMLElement).addEventListener('click', e => {
            const target = e.target as HTMLElement;
            const id = (target.parentNode as HTMLElement).getAttribute('data-id') || target.getAttribute('data-id');
            if (!id) return;
            if (target.classList.contains('config')) ctrl.chapters.editForm.toggle(ctrl.chapters.get(id));
            else ctrl.setChapter(id);
          });
          update(vnode);
        },
        postpatch: (_, vnode) => update(vnode),
        destroy: vnode => {
          if (vnode.data!.sortable) vnode.data!.sortable.destroy();
        }
      }
    }, [
      ctrl.chapters.list().map(function(chapter, i) {
        var editing = ctrl.chapters.editForm.isEditing(chapter.id);
        var loading = ctrl.vm.loading && chapter.id === ctrl.vm.nextChapterId;
        var active = !ctrl.vm.loading && current && current.id === chapter.id;
        return [
          h('div.elem.chapter.draggable', {
            key: chapter.id,
            attrs: { 'data-id': chapter.id },
            class: { active, editing, loading }
          }, [
            h('span.status', i + 1),
            h('h3', chapter.name),
            configButton
          ])
        ];
      }),
      ctrl.members.canContribute() ? h('div.elem.chapter.add', {
        hook: bind('click', ctrl.chapters.toggleNewForm, ctrl.redraw)
      }, [
        h('span.status', h('i', { attrs: { 'data-icon': 'O' } })),
        h('h3.add_text', 'Add a new chapter')
      ]) : null
    ])
  ];
}
