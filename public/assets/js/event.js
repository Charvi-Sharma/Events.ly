$(document).ready(function(){
    $('.delete-event').on('click',function(){
        let id = $(this).data('id');
        console.log(typeof(id));
        let url = '/users/event_delete/' + id;
        console.log("checking");
        console.log(url);
        if(confirm('Are you sure you want to delete this event?')){
            $.ajax({
                url: url,
                type: 'DELETE',
                success: function(result){
                    console.log('Deleting event...');
                    window.location.href='/';
                },
                error: function (err) {
                    console.log(err);

                }
            });
        }
    });
    $('.edit-event').on('click',function(){
        $('#edit-form-name').val($(this).data('name'));
        $('#edit-form-description').val($(this).data('description'));
        $('#edit-form-id').val($(this).data('id'));
        let event_id = $(this).data('event-id');
        let event_name = $(this).data('event-name');
        let event_description = $(this).data('event-description');
    });
    $('.participants-event').on('click',function(){
        // $('#edit-form-name').val($(this).data('name'));
        // $('#participants-form-participants').val($(this).data('participants'));
        console.log('event-participants');
        $('#participants-form-id').val($(this).data('id'));
        let event_id = $(this).data('event-id');
        let event_participants = $(this).data('event-participants');
    });
    $('.accept').on('click',function(){
        // $('#edit-form-name').val($(this).data('name'));
        // $('#participants-form-participants').val($(this).data('participants'));
        $('#accept-form-id').val($(this).data('id'));
        let event_id = $(this).data('event-id');
        // let event_participants = $(this).data('event-participants');
    });
});
