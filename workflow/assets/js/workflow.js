(function($) {
	init();
	
	function init() {
		initWorkflows();
		
		$(function() {
			// Make the workflows list sortable
			$('.list-group').sortable({
				// When the order of the items has changed, notify the server via AJAX request.
				update: function(event, ui ) {
					var sortedIDs = $('.list-group').sortable( "toArray", {attribute: 'data-id'} );

					$.ajax({
						url: ajaxurl,
						method: 'POST',
						data: {
							action: 'update-workflows-id-order',
							ids: sortedIDs
						}
					});
				}
			});

			/*
			 * Event Handlers
			***************************************************************************************/
			$( 'body' ).on( 'change', 'select.variable-types', function() {
				var	$operation = $( this ).parents( '.operation:first' ),
					$variablesContainer = $operation.find( '.operation-inputs' ),
					variableTypeId = $( this ).val(),
					variableDataType = WORKFLOWS_SETTINGS['variable-types'][ variableTypeId ].dataType;
				
				if ( -1 === variableTypeId ) {
					$variablesContainer.hide();
					return;
				}
				
				$variablesContainer.css('display', 'block');
				
				var $colOperator = $variablesContainer.find('.col:first'),
					$colVariable = $variablesContainer.find('.col:last'),
					$operators = createFromTemplate('operators'),
					allOperators = WORKFLOWS_SETTINGS.operators,
					supportedOperators = allOperators[ variableDataType ];

				$colOperator.html('');
				$colVariable.html('');

				$colOperator.append($operators);
				
				for ( var operatorId in supportedOperators ) {
					$operators.append('<option value="' + operatorId + '">' + supportedOperators[ operatorId ].title + '</option>');
				}
				
				$colVariable.append( createFromTemplate( variableTypeId ) );
			});
			
			$( '#edit-workflow' ).on( 'click' , '.button.next-step', function( event ) {
				event.preventDefault();
				
				var	$button	 = $( this ),
					$currentTab = $button.parents( '.tab-pane:first' ),
					$nextTab = $( $currentTab.data( 'next-step' ) ),
					currentStep = $currentTab.attr( 'id' ),
					workflowId = $( '#edit-workflow' ).attr( 'data-id' );
					
				if ( ! workflowId ) {
					workflowId = '';
				}
				
				if ( 'edit-name' === currentStep ) {
					var name = $( '#workflow-name' ).val().trim();
					if ( 0 === name.length ) {
						showError( WORKFLOWS_SETTINGS.text.invalid_workflow );
						return false;
					}

					$.ajax({
						url: ajaxurl,
						method: 'POST',
						data: {
							action: ( workflowId.length > 0 ) ? 'update-workflow' : 'create-workflow',
							name: name,
							id: workflowId
						},
						success: function( result ) {
							if ( 0 === workflowId.length ) {
								var jsonResult = JSON.parse( result ),
									$editConditions = $( '#edit-conditions' ).find( '.edit-conditions' ),
									$workflowsPanel = $( '#workflows > .panel' ),
									$listGroup		= $workflowsPanel.children( '.list-group' );

								workflowId = jsonResult.data.id;

								var $listGroupItemTemplate = $( '.list-group-item[data-id="' + workflowId + '"]' );
								if ( 0 === $listGroupItemTemplate.length ) {
									$listGroupItemTemplate = createFromTemplate( 'list-group-item' );
									$listGroupItemTemplate.attr( 'data-id', workflowId );
									$listGroup.append( $listGroupItemTemplate );
								}

								$listGroupItemTemplate.find( '.list-group-item-content' ).html( name );
									
								if ( 0 === $editConditions.length ) {
									$editConditions = createFromTemplate( 'edit-conditions' );
									$( '#edit-conditions' ).prepend( $editConditions );

									var $newCondition = createFromTemplate( 'condition' );
									$editConditions.find( '.panel-heading' ).append( $newCondition );

									var $newOperation = createFromTemplate( 'operation' );
									var $operationsList = $newCondition.find( '.operations-list' );
									$operationsList.append( $newOperation );
								}
								
								$editConditions.find( 'select.variable-types' ).change();

								$( '#edit-workflow' ).attr( 'data-id', workflowId );
								WORKFLOWS_SETTINGS.workflows[ workflowId ] = jsonResult.data.workflow;
							}

							$( '.nav-pills li:nth-child(1)' ).removeClass( 'active' );
							$( '.nav-pills li:nth-child(2)' ).removeClass( 'disabled' ).find( 'a' ).attr( 'data-toggle', 'tab' ).tab( 'show' );
						},
						complete: function(a, b) {
							$button.button('reset');
						},
						beforeSend: function() {
							$button.button('loading');
						}
					});
				} else if ( 'edit-conditions' === currentStep ) {
					$button.button('loading');

					updateConditions(function() {
						var $editActions = $('#edit-actions').find('.edit-actions');

						if ( 0 === $editActions.length ) {
							$editActions = createFromTemplate('edit-actions');
							$('#edit-actions').prepend( $editActions );

							$editActions.find('.operation > .col').append( createFromTemplate('actions') );
						}

						$('.nav-pills li:nth-child(2)').removeClass('active');
						$('.nav-pills li:nth-child(3)').removeClass('disabled').find('a').attr('data-toggle', 'tab').tab('show');
					}, function() {
						$button.button('reset');
					});
				} else if ( 'edit-actions' === currentStep ) {
					$button.button( 'loading' );

					updateActions(function() {
						var $editEvents = $( '#edit-events' ).find( '.edit-events' );

						if ( 0 === $editEvents.length ) {
							$editEvents = createFromTemplate( 'edit-events' );
							$( '#edit-events' ).prepend( $editEvents );

							$editEvents.find( '.operation > .col' ).append( createFromTemplate( 'event-types' ) );
						}

						$( '.nav-pills li:nth-child(3)' ).removeClass( 'active' );
						$( '.nav-pills li:nth-child(4)' ).removeClass( 'disabled' ).find( 'a' ).attr( 'data-toggle', 'tab' ).tab( 'show' );
					}, function() {
						$button.button( 'reset' );
					});
				} else if ( 'edit-events' === currentStep ) {
					$button.button( 'loading' );

					updateEvents(function() {
						var $workflowSummary = $( '#edit-summary' ).find( '.workflow-summary' );

						if ( 0 === $workflowSummary.length ) {
							$workflowSummary = createFromTemplate( 'workflow-summary' );
							$( '#edit-summary' ).prepend( $workflowSummary );
						} else {
							$workflowSummary.find( '.list-group:first' ).html('');
							$workflowSummary.find( '.list-group:last' ).html('');
						}

						var title = $( '#workflow-name' ).val(),
							$allConditions = $('#edit-conditions .edit-conditions .operations-container'),
							$allActions = $('#edit-actions .edit-actions .operations-container'),
							$allEvents = $('#edit-events .edit-events .operations-container');

						var conditionsHtml = '';
						$allConditions.each(function() {
							var conditions = [];

							$( this ).find( '.operations-list' ).children().each(function() {
								var $condition = $(this),
									variableTypeId = $condition.find('.variable-types').val(),
									variableType = WORKFLOWS_SETTINGS['variable-types'][ variableTypeId ],
									operatorId = $condition.find( '.operators' ).val(),
									operand = ( 'dropdown' === variableType.field.type ) ? $condition.find('.operation-inputs .col:last select').val() : $condition.find('.operation-inputs .col:last input').val(),
									condition = '',
									operandTypeValues = (variableType.values ? variableType.values : []);


								var conditionItem = 
									WORKFLOWS_SETTINGS['variable-types'][ variableTypeId ].title
									+ ' ' + WORKFLOWS_SETTINGS.operators[ variableType.dataType ][ operatorId ].title;

								if ( 'dropdown' === variableType.field.type ) {
									conditionItem += ' ' + '<strong>' + ( undefined != operandTypeValues[ operand ] ? operandTypeValues[ operand ].title : '' ) + '</strong>';
								} else {
									conditionItem += ' ' + '<strong>' + operand + '</strong>';
								}

								conditions.push(conditionItem);

							});

							var condition = '<li class="list-group-item">';

							if ( '' != conditionsHtml ) {
								condition += '<span class="label label-default and">and</span>';
							}

							condition += conditions.join('<span class="label label-default or">or</span>') + '</li>';

							conditionsHtml += condition;
						});

						var actionsHtml = '';
						$allActions.each(function() {
							var $action = $(this),
								actionId = $action.find('select.actions').val();


							var action = '<li class="list-group-item">';

							if ( '' != actionsHtml ) {
								action += '<span class="label label-default and">and</span>';
							}

							action += WORKFLOWS_SETTINGS.actions[ actionId ].title + '</li>';

							actionsHtml += action;
						});

						var eventTypesHtml = '';
						$allEvents.each(function() {
							var $eventType = $(this),
								eventTypeId = $eventType.find('select.event-types').val();


							var eventType = '<li class="list-group-item">';

							if ( '' != eventTypesHtml ) {
								eventType += '<span class="label label-default and">or</span>';
							}

							eventType += WORKFLOWS_SETTINGS['event-types'][ eventTypeId ].title + '</li>';

							eventTypesHtml += eventType;
						});

						$workflowSummary.find('.workflow-title').text(title);
						$workflowSummary.find('.list-group:eq(0)').html(conditionsHtml);
						$workflowSummary.find('.list-group:eq(1)').html(actionsHtml);
						$workflowSummary.find('.list-group:eq(2)').html(eventTypesHtml);

						$('.nav-pills li:nth-child(4)').removeClass('active');
						$('.nav-pills li:nth-child(5)').removeClass('disabled').find('a').attr('data-toggle', 'tab').tab('show');

						$('#edit-workflow').addClass('is-editing');
					}, function() {
						$button.button('reset');
					});
				}
			});
			
			$('body').on('click', '.button.save', function(e) {
				e.preventDefault();
				
				var	$button	 = $(this),
					$currentTab = $button.parents( '.tab-pane:first' ),
					currentTabId = $currentTab.attr( 'id' );
					
				if ( 'edit-name' === currentTabId ) {
					var name = $( '#workflow-name' ).val().trim();
					if ( ! name ) {
						alert( 'Invalid Workflow Name' );
						return false;
					}

					var workflowId = $( '#edit-workflow' ).attr( 'data-id' );

					$.ajax({
						url: ajaxurl,
						method: 'POST',
						data: {
							action: 'update-workflow',
							name: name,
							id: workflowId ? workflowId : ''
						},
						success: function( result ) {
							updateSummary();
							showSummary();
						},
						complete: function(a, b) {
							$button.button( 'reset' );
						},
						beforeSend: function() {
							$button.button( 'loading' );
						}
					});
				} else if ( 'edit-conditions' === currentTabId ) {
					$button.button( 'loading' );
					updateConditions(function() {
						updateSummary();
						showSummary();
					}, function() {
						$button.button( 'reset' );
					});
				} else if ( 'edit-actions' === currentTabId ) {
					$button.button( 'loading' );
					updateActions( function() {
						updateSummary();
						showSummary();
					}, function() {
						$button.button( 'reset' );
					});
				} else if ( 'edit-events' === currentTabId ) {
					$button.button( 'loading' );
					updateEvents(function() {
						updateSummary();
						showSummary();
					}, function() {
						$button.button( 'reset' );
					});
				}
			});
			
			
			$( '#new-workflow' ).click(function(e) {
				e.preventDefault();
				
				resetWorkflow();
				
				$( 'a[href="#edit-name"]' ).tab('show');
				$( this ).tab( 'show' );
			});
			
			$('body').on('click', '.workflow-summary .button.edit-workflow', function(e) {
				e.preventDefault();
				
				if ( $( this ).hasClass( 'edit-conditions' ) ) {
					var href = $(this).attr('href');
					$( '.nav-pills' ).children().removeClass( 'active' ).find( 'a[href="' + href + '"]' ).parent().addClass( 'active' );
					var workflowId = $( '#edit-workflow' ).attr( 'data-id' ),
						workflow = WORKFLOWS_SETTINGS.workflows[ workflowId ],
						$editConditions = $( '#edit-conditions' ).find( '.edit-conditions' );

					if ( 0 === $editConditions.length ) {
						$editConditions = createFromTemplate( 'edit-conditions' );
						$( '#edit-conditions' ).prepend( $editConditions );
					} else {
						$editConditions.find( '.panel-heading' ).html('');
					}
					
					var $newCondition = createFromTemplate( 'condition' );
					$editConditions.find( '.panel-heading' ).append( $newCondition );
					
					var totalConditions = workflow.conditions.length;
					for ( var idx in workflow.conditions ) {
						if ( ! workflow.conditions.hasOwnProperty( idx ) ) {
							continue;
						}
						
//							$newOperation = createFromTemplate( 'operation' ),
//							$operationsList = $newCondition.find( '.operations-list' );
//							
//						$operationsList.append( $newOperation );
							
						if ( totalConditions > 1 && ( idx < totalConditions - 1 ) ) {
						}
						
						if ( idx > 0 ) {
							$editConditions.find( '.and-operation-container > p:last' ).replaceWith('<div><p class="and-operation"><em>' + WORKFLOWS_SETTINGS.text.and + '</em></p></div>');
							$newCondition = createFromTemplate( 'condition' );
							$editConditions.find( '.and-operation-container' ).append( $newCondition.children() );
						}
						
						var conditionsArr = workflow.conditions[ idx ];
						for ( var idx2 in conditionsArr ) {
							if ( ! conditionsArr.hasOwnProperty( idx2 ) ) {
								continue;
							}

							var singleCondition = conditionsArr[ idx2 ],
								operandTypeId = singleCondition.operandType,
								operandType = WORKFLOWS_SETTINGS['variable-types'][ operandTypeId ],
								operatorId = singleCondition.operator,
								operand = singleCondition.operand;
								
							var $newOperation = createFromTemplate( 'operation' );
							var $operationsList = $editConditions.find( '.operations-list:last' );
							$operationsList.append( $newOperation );
							
							$newOperation.find( 'select.variable-types' ).val( operandTypeId ).change();
							$newOperation.find( 'select.operators' ).val( operatorId );
							
							if ( 'dropdown' === operandType.field.type ) {
								$newOperation.find( 'select.' + operandTypeId ).val( operand );
							} else {
								$newOperation.find( 'input.' + operandTypeId ).val( operand );
							}
						}
					}
				} else if ( $(this).hasClass('edit-actions') ) {
					var href = $(this).attr( 'href' );
					$( '.nav-pills' ).children().removeClass( 'active' ).find( 'a[href="' + href + '"]' ).parent().addClass('active');
					var workflowId = $( '#edit-workflow' ).attr( 'data-id' ),
						workflow = WORKFLOWS_SETTINGS.workflows[ workflowId ],
						$editActions = $( '#edit-actions' ).find( '.edit-actions' );

					if ( 0 === $editActions.length ) {
						$editActions = createFromTemplate( 'edit-actions' );
						$editActions.find( '.and-operation-container' ).html( '' );
						$( '#edit-actions' ).prepend( $editActions );
					} else {
						$editActions.find( '.and-operation-container' ).html( '' );
					}
					
					$editActions.find( 'select' ).html('');
					
					if ( 0 === workflow.actions.length ) {
						var $newAction = createFromTemplate( 'action-template' );
						$newAction.find( '.operation > .col' ).append( createFromTemplate( 'actions' ) );
						$editActions.find( '.and-operation-container' ).append( $newAction.children() );
						return;
					}
					
					for ( var idx in workflow.actions ) {
						if ( ! workflow.actions.hasOwnProperty( idx ) ) {
							continue;
						}

						if ( idx > 0 ) {
							var $lastAction = $editActions.find( '.and-operation-container > div:last' );
							$lastAction.find(' > p.and').replaceWith('<div><p class="and"><em>AND</em></p></div>');
						}
						
						var actionId = workflow.actions[ idx ];
							
						var $newAction = createFromTemplate( 'action-template' );
						$newAction.find( '.operation > .col' ).append( createFromTemplate( 'actions' ) );
						$newAction.find( 'select' ).val( actionId );
						$editActions.find( '.and-operation-container' ).append( $newAction.children() );
					}
				} else if ( $(this).hasClass( 'edit-events' ) ) {
					var href = $(this).attr('href');
					$( '.nav-pills' ).children().removeClass( 'active' ).find( 'a[href="' + href + '"]' ).parent().addClass('active');
					var workflowId = $( '#edit-workflow' ).attr( 'data-id' ),
						workflow = WORKFLOWS_SETTINGS.workflows[ workflowId ],
						$editEventTypes = $( '#edit-events' ).find( '.edit-events' );

					if ( 0 === $editEventTypes.length ) {
						$editEventTypes = createFromTemplate( 'edit-events' );
						$editEventTypes.find( '.and-operation-container' ).html( '' );
						$( '#edit-events' ).prepend( $editEventTypes );
					} else {
						$editEventTypes.find( '.and-operation-container' ).html( '' );
					}
					
					$editEventTypes.find( 'select' ).html( '' );
					
					if ( 0 === workflow.eventTypes.length ) {
						var $newTrigger = createFromTemplate('event-type-template');
						$newTrigger.find( '.operation > .col' ).append( createFromTemplate( 'event-types' ) );
						$editEventTypes.find( '.and-operation-container' ).append( $newTrigger );
						
						return;
					}
					
					for ( var idx in workflow.eventTypes ) {
						if ( ! workflow.eventTypes.hasOwnProperty( idx ) ) {
							continue;
						}

						if ( idx > 0 ) {
							var $lastTrigger = $editEventTypes.find( '.workflowCondActions > div:last' );
							$lastTrigger.find(' > p.and').replaceWith( '<div><p class="and"><em>OR</em></p></div>' );
						}
						
						var $newTrigger = createFromTemplate('event-type-template');
						$editEventTypes.find( '.and-operation-container' ).append( $newTrigger );
						
						var eventTypeId = workflow.eventTypes[ idx ];
							
						$newTrigger.find( '.operation > .col' ).append( createFromTemplate( 'event-types' ) );
						$newTrigger.find( 'select' ).val( eventTypeId );
					}
				} else {
					return;
				}
				
				$(this).tab('show');
			});
			
			$( '#workflows' ).on( 'click', '.button.remove-workflow', function() {
				var	$button = $( this ),
					targetWorkflowId = $button.parents('.list-group-item:first').attr('data-id');
				
				$('#confirm-delete-workflow').attr('data-target-workflow-id', targetWorkflowId);
				$('#confirm-delete-workflow').addClass( 'active' );
			});

			$('#confirm-delete-workflow').on( 'click', '.button-primary', function( evt ) {
				evt.preventDefault();
				
				$('#confirm-delete-workflow').removeClass('active');
				
				var workflowId		= $('#confirm-delete-workflow').attr('data-target-workflow-id'),
					$listGroupItem	= $('.list-group.ui-sortable a.list-group-item[data-id="'+workflowId+'"]'),
					len				= $listGroupItem.length;

				if ( workflowId ) {
					$.ajax({
						url: ajaxurl,
						method: 'POST',
						data: {
							action: 'delete-workflow',
							id: workflowId
						},
						success: function(result) {
							result = JSON.parse(result);
//							if (result.success) {
								$('.list-group-item[data-id="'+workflowId+'"]').remove();
//							}
						},
						beforeSend: function() {
							$listGroupItem.addClass('disabled');

							text = $listGroupItem.find('.list-group-item-content').text();
							$listGroupItem.find('.list-group-item-content').text(text + ' (deleting...)');
						},
						complete: function(a, b) {
							var a;
						}
					});
				}
			});

			$( '#workflows' ).on( 'change', '.workflow-state', function(evt) {
				var workflowId	= $( this ).parents( '.list-group-item:first' ).attr( 'data-id' ),
					active		= $( this ).prop( 'checked' );

				$.ajax({
					url: ajaxurl,
					method: 'POST',
					data: {
						action: 'update-workflow',
						id: workflowId,
						active: active
					}
				});
			});
			
			$( '#workflows' ).on( 'click', '.list-group-item-content', function(evt) {
				evt.preventDefault();

				var $workflowSummary = $( '#edit-summary' ).find( '.workflow-summary' );

				if ( 0 === $workflowSummary.length ) {
					$workflowSummary = createFromTemplate( 'workflow-summary' );
					$( '#edit-summary' ).prepend( $workflowSummary );
				} else {
					$workflowSummary.find('.list-group:first').html('');
					$workflowSummary.find('.list-group:last').html('');
				}
				
				var workflowId = $( this ).parent().attr( 'data-id' );
				var workflow = WORKFLOWS_SETTINGS.workflows[ workflowId ];
				
				var conditionsHtml = '';
				for ( var idx in workflow.conditions ) {
					if ( ! workflow.conditions.hasOwnProperty( idx ) ) {
						continue;
					}
					
					var conditions = [];
					
					var conditionsArr = workflow.conditions[ idx ];
					for ( var idx2 in conditionsArr ) {
						if ( ! conditionsArr.hasOwnProperty( idx2 ) ) {
							continue;
						}
						
						var singleCondition = conditionsArr[ idx2 ],
							variableTypeId = singleCondition.operandType,
							variableType = WORKFLOWS_SETTINGS['variable-types'][ variableTypeId ],
							operatorId = singleCondition.operator,
							operand = singleCondition.operand,
							condition = '';
							
						var operandTypeValues = ( WORKFLOWS_SETTINGS['variable-types'][ variableTypeId ].values ) ? ( WORKFLOWS_SETTINGS['variable-types'][ variableTypeId ].values ) : [] ;
						
						var _condition = WORKFLOWS_SETTINGS['variable-types'][ variableTypeId ].title
							+ ' ' + WORKFLOWS_SETTINGS.operators[ variableType.dataType ][ operatorId ].title

						if ( 'dropdown' === variableType.field.type ) {
							_condition += ' ' + '<strong>' + ( operandTypeValues[ operand ] ? operandTypeValues[ operand ].title : '' ) + '</strong>';
						} else {
							_condition += ' ' + '<strong>' + operand + '</strong>';
						}
						
						conditions.push( _condition );
					}

					var condition = '<li class="list-group-item">';

					if ( '' != conditionsHtml ) {
						condition += '<span class="label label-default and">and</span>';
					}

					condition += conditions.join('<span class="label label-default or">or</span>') + '</li>';

					conditionsHtml += condition;
				}

				var actionsHtml = '';
				for ( var idx in workflow.actions ) {
					if ( ! workflow.actions.hasOwnProperty( idx ) ) {
						continue;
					}
					
					var actionId = workflow.actions[ idx ],
						action = '<li class="list-group-item">';

					if ( '' != actionsHtml ) {
						action += '<span class="label label-default and">and</span>';
					}

					action += WORKFLOWS_SETTINGS.actions[ actionId ].title + '</li>';

					actionsHtml += action;
				}

				var eventTypesHtml = '';
				for ( var idx in workflow.eventTypes ) {
					if ( ! workflow.eventTypes.hasOwnProperty( idx ) ) {
						continue;
					}
					
					var eventTypeId = workflow.eventTypes[ idx ];

					var eventType = '<li class="list-group-item">';

					if ( '' != eventTypesHtml ) {
						eventType += '<span class="label label-default and">or</span>';
					}

					eventType += WORKFLOWS_SETTINGS['event-types'][ eventTypeId ].title + '</li>';

					eventTypesHtml += eventType;
				}

				$workflowSummary.find('.workflow-title').text(workflow.name);
				$workflowSummary.find('.list-group:eq(0)').html(conditionsHtml);
				$workflowSummary.find('.list-group:eq(1)').html(actionsHtml);
				$workflowSummary.find('.list-group:eq(2)').html(eventTypesHtml);
				
				$( '#edit-workflow' ).addClass('is-editing').attr('data-id', workflowId);
				$( '#workflows' ).removeClass( 'active' );
				$( '#edit-workflow' ).addClass( 'active' );
				$( 'a[href="#edit-summary"]' ).parent().removeClass( 'active' );
				$( 'a[href="#edit-summary"]' ).tab('show');
			});
			
			$( 'body' ).on( 'click', '.rw-wf-modal .btn-close', function() {
				$( this ).parents( '.rw-wf-modal:first' ).removeClass( 'active' );
			});
			
			$( 'body' ).on( 'click', '.and-operation-container .add-or, .and-operation-container .remove-operation, .and-operation-container .add-operation', function() {
				var $currentTab = $( this ).parents( '.tab-pane:first' ),
					currentTabId = $currentTab.attr( 'id' );
				
				if ( $( this ).hasClass( 'add-operation' ) ) {
					if ( $( this ).parent().hasClass( 'add-or' ) ) {
						if ( 'edit-conditions' === currentTabId ) {
							var $newOperation = createFromTemplate( 'operation' );
							var $operationsList = $( this ).parent().prev();
							$operationsList.append( $newOperation );
							$newOperation.find( 'select.variable-types' ).change();
						}
					} else if( $( this ).parent().hasClass( 'and-operation' ) ) {
						if ( 'edit-conditions' === currentTabId ) {
							var $newCondition = createFromTemplate( 'condition' ),
								$newOperation = createFromTemplate( 'operation' ),
								$operationsList = $newCondition.find( '.operations-list' );
							
							$operationsList.append( $newOperation );
							
							$currentTab.find( '.and-operation-container > p:last' ).replaceWith('<div><p class="and-operation"><em>' + WORKFLOWS_SETTINGS.text.and + '</em></p></div>');
							$currentTab.find( '.and-operation-container' ).append( $newCondition.children() );
							$newOperation.find( 'select.variable-types' ).change();
						} else if ( 'edit-actions' === currentTabId ) {
							var $newAction = createFromTemplate( 'action-template', true );
							$newAction.find( '.operation > .col' ).append( createFromTemplate( 'actions' ) );

							$currentTab.find( '.and-operation-container > p.and-operation' ).replaceWith( '<div><p class="and-operation"><em>' + WORKFLOWS_SETTINGS.text.and + '</em></p></div>' );
							$currentTab.find( '.and-operation-container' ).append( $newAction.children() );
						} else if ( 'edit-events' === currentTabId ) {
							var $newEvent = createFromTemplate( 'event-type-template', true );
							$newEvent.find( '.operation > .col' ).append( createFromTemplate( 'event-types' ) );

							$currentTab.find( '.and-operation-container > p.and-operation' ).replaceWith( '<div><p class="and-operation"><em>' + WORKFLOWS_SETTINGS.text.or + '</em></p></div>' );
							$currentTab.find( '.and-operation-container' ).append( $newEvent.children() );
						}
					}
				} else if ( $( this ).hasClass( 'remove-operation' ) ) {
					if ( 'edit-conditions' === currentTabId ) {
						var $operationsList = $( this ).parents('.operations-list:first'),
							totalOperations = $operationsList.children('.operation').length;

						if ( totalOperations > 1 ) {
							var $operation = $( this ).parents( '.operation:first' ),
								idx = $operation.index();

							$operation.remove();
							totalOperations--;

							if ( 0 === idx ) {
								$operation = $operationsList.find( '.operation:first' );
								$operation.children( '.badge' ).remove();
							}
						} else {
							var totalOperationsContainer = $currentTab.find( '.and-operation-container > .operations-container' ).length,
								$operationsContainer = $operationsList.parents( 'div:first' ),
								$operationsContainerIdx = $operationsContainer.index();
							
							if ( totalOperationsContainer > 1 ) {
								$operationsContainer.prev().remove();
								
								if ( 0 === $operationsContainerIdx ) {
									$operationsContainer.next().remove();
								}
								
								$operationsContainer.remove();
							}
						}
					} else if ( 'edit-actions' === currentTabId ) {
						var	$action = $( this ).parents( '.operations-container:first' ),
							totalActions = $currentTab.find( '.operations-container' ).length,
							actionIdx = $action.index();
							
						if ( totalActions > 1 ) {
							if ( 0 === actionIdx ) {
								$action.next().remove();
							} else {
								$action.prev().remove();
							}

							$action.remove();
						}
					} else if ( 'edit-events' === currentTabId ) {
						var	$event = $( this ).parents( '.operations-container:first' ),
							totalEvents = $currentTab.find( '.operations-container' ).length,
							eventIdx = $event.index();
							
						if ( totalEvents > 1 ) {
							if ( 0 === eventIdx ) {
								$event.next().remove();
							} else {
								$event.prev().remove();
							}

							$event.remove();
						}
					}
				}
			});
		});
	}
	
	/**
	 * Shows an admin notice element containing the error message.
	 * 
	 * @param string msg
	 */
	function showError( message ) {
		alert( message );
	}
	
	/**
	 * Resets the default content of the edit/create workflow panels:
	 * 1. Removes the current conditions, actions, events, and reset the summary content.
	 * 2. Reset the state of the buttons.
	 */
	function resetWorkflow() {
		$( '#edit-workflow' ).removeClass( 'is-editing' ).addClass( 'is-creating' ).data( 'id', '' );
		$( 'div.edit-actions, div.edit-conditions, div.edit-events' ).remove();

		$( 'a[href="#edit-conditions"]' ).tab( 'show' );
	}
	
	/**
	 * Updates the conditions of this workflow.
	 */
	function updateConditions( successCallback, completeCallback ) {
		var $currentTab = $( '#edit-workflow > div > .tab-content .tab-pane.active' ),
			allConditions = [];
	
		$currentTab.find( '.and-operation-container' ).children( '.operations-container' ).each(function() {
			var conditions = [];
			$(this).find( '.operations-list' ).children().each(function() {
				var variableTypeId = $( this ).find( '.variable-types' ).val();
				var variableType = WORKFLOWS_SETTINGS['variable-types'][ variableTypeId ];
				var operator = $( this ).find( '.operators' ).val();
				
				var operand = false;
				if ( 'dropdown' === variableType.field.type ) {
					operand = $( this ).find( '.operation-inputs .col:last select' ).val();
				} else if ( 'textfield' === variableType.field.type ) {
					operand = $( this ).find( '.operation-inputs .col:last input' ).val();
				}
				
				var condition = {
					operandType: variableTypeId,
					operator: operator,
					operand: operand
				};

				conditions.push(condition);
			});

			if ( conditions.length > 0 ) {
				allConditions.push(conditions);
			}
		});

		$.ajax({
			url: ajaxurl,
			method: 'POST',
			data: {
				action: 'update-workflow',
				id: $('#edit-workflow').attr('data-id'),
				conditions: allConditions
			},
			success: function( result ) {
				WORKFLOWS_SETTINGS.workflows[ $('#edit-workflow').attr('data-id') ].conditions = allConditions;
				successCallback( JSON.parse(result) );
			},
			complete: function() {
				completeCallback();
			}
		});
	}
	
	function updateActions( successCallback, completeCallback ) {
		var $currentTab = $( '#edit-workflow > div > .tab-content .tab-pane.active' ),
			actions = [];
	
		$currentTab.find( '.operations-list' ).children().each(function() {
			actions.push( $( this ).find( 'select.actions' ).val() );
		});

		$.ajax({
			url: ajaxurl,
			method: 'POST',
			data: {
				action: 'update-workflow',
				id: $( '#edit-workflow' ).attr( 'data-id' ),
				actions: actions
			},
			success: function( result ) {
				WORKFLOWS_SETTINGS.workflows[ $( '#edit-workflow' ).attr( 'data-id' ) ].actions = actions;
				successCallback( JSON.parse( result ) );
			},
			complete: function() {
				completeCallback();
			}
		});
	}
	
	function updateEvents( successCallback, completeCallback ) {
		var $currentTab = $( '#edit-workflow > div > .tab-content .tab-pane.active' ),
			event_types = [];
	
		$currentTab.find( '.operations-list' ).children().each(function() {
			event_types.push( $( this ).find( 'select.event-types' ).val() );
		});

		$.ajax({
			url: ajaxurl,
			method: 'POST',
			data: {
				action: 'update-workflow',
				id: $('#edit-workflow').attr('data-id'),
				event_types: event_types
			},
			success: function( result ) {
				WORKFLOWS_SETTINGS.workflows[ $('#edit-workflow').attr('data-id') ].eventTypes = event_types;
				successCallback( JSON.parse(result) );
			},
			complete: function() {
				completeCallback();
			}
		});
	}

	/**
	 * Updates the contents (conditions, actions, and event types) of the summary view
	 */
	function updateSummary() {
		var $workflowSummary = $( '#edit-summary' ).find( '.workflow-summary' );

		if ( 0 === $workflowSummary.length ) {
			$workflowSummary = createFromTemplate( 'workflow-summary' );
			$( '#edit-summary' ).prepend( $workflowSummary );
		} else {
			$workflowSummary.find( '.list-group' ).html( '' );
		}

		var workflowId = $( '#edit-workflow' ).attr( 'data-id' );
		var workflow = WORKFLOWS_SETTINGS.workflows[ workflowId ];

		var conditionsHtml = '';
		for ( var idx in workflow.conditions ) {
			if ( ! workflow.conditions.hasOwnProperty( idx ) ) {
				continue;
			}

			var conditions = [];

			var conditionsArr = workflow.conditions[ idx ];
			for ( var idx2 in conditionsArr ) {
				if ( ! conditionsArr.hasOwnProperty( idx2 ) ) {
					continue;
				}

				var singleCondition = conditionsArr[ idx2 ],
					operandId = singleCondition.operandType,
					operatorId = singleCondition.operator,
					operandType = WORKFLOWS_SETTINGS['variable-types'][ operandId ],
					operand = singleCondition.operand,
					condition = '',
					operandTypeValues = (operandType.values ? operandType.values : []);

				var conditionItem = 
					WORKFLOWS_SETTINGS['variable-types'][ operandId ].title
					+ ' ' + WORKFLOWS_SETTINGS.operators[ operandType.dataType ][ operatorId ].title;
			
				if ( 'dropdown' === operandType.field.type ) {
					conditionItem += ' ' + '<strong>' + ( undefined != operandTypeValues[ operand ] ? operandTypeValues[ operand ].title : '' ) + '</strong>';
				} else {
					conditionItem += ' ' + '<strong>' + operand + '</strong>';
				}
				
				conditions.push(conditionItem);
			}

			var condition = '<li class="list-group-item">';

			if ( '' != conditionsHtml ) {
				condition += '<span class="label label-default and">and</span>';
			}

			condition += conditions.join('<span class="label label-default or">or</span>') + '</li>';

			conditionsHtml += condition;
		}

		var actionsHtml = '';
		for ( var idx in workflow.actions ) {
			if ( ! workflow.actions.hasOwnProperty( idx ) ) {
				continue;
			}

			var actionId = workflow.actions[ idx ];

			var action = '<li class="list-group-item">';

			if ( '' != actionsHtml ) {
				action += '<span class="label label-default and">and</span>';
			}

			action += WORKFLOWS_SETTINGS.actions[ actionId ].title + '</li>';

			actionsHtml += action;
		}

		var eventTypesHtml = '';
		for ( var idx in workflow.eventTypes ) {
			if ( ! workflow.eventTypes.hasOwnProperty( idx ) ) {
				continue;
			}

			var eventTypeId = workflow.eventTypes[ idx ];

			var eventType = '<li class="list-group-item">';

			if ( '' != eventTypesHtml ) {
				eventType += '<span class="label label-default and">or</span>';
			}

			eventType += WORKFLOWS_SETTINGS['event-types'][ eventTypeId ].title + '</li>';

			eventTypesHtml += eventType;
		}

		$workflowSummary.find('.workflow-title').text(workflow.name);
		$workflowSummary.find('.list-group:eq(0)').html(conditionsHtml);
		$workflowSummary.find('.list-group:eq(1)').html(actionsHtml);
		$workflowSummary.find('.list-group:eq(2)').html(eventTypesHtml);
	}
	
	/**
	 * Displays the workflow summary: If ... Then ... When ...
	 */
	function showSummary() {
		$( '.nav-pills' ).children().removeClass( 'active' );
		$( 'a[href="#edit-summary"]' ).attr( 'data-toggle', 'tab' ).tab('show');
	}
	
	/**
	 * Clones a template element and sets the cloned element's ID and class based on the templates data attributes.
	 * 
	 * @returns object jQuery element object
	 */
	function createFromTemplate( templateClass, defaultValue ) {
		var $template = $( '.workflow-template[data-class^="' + templateClass + '"]' ).clone();
		$template.attr({
			'class': $template.data( 'class' ),
			'data-class': ''
		});
		
		if ( $template.data( 'id' ) ) {
			$template.attr( 'id', $template.data( 'id' ) );
		}
		
		if ( defaultValue ) {
			$template.val( defaultValue );
		}
		
		return $template;
	}
	
	/**
	 * Creates the list of workflows and populates the operators dropdown list.
	 *
	 */
	function initWorkflows() {
		populateWorkflowsList();
		
		// Create the template <option> HTML element containing all supported actions. e.g.: 'Ask to Tweet the rated element'.
		populateDropdownTemplate( 'actions', WORKFLOWS_SETTINGS.actions );
		
		// Create the template <option> HTML element containing all supported event types. e.g.: 'afterVote' or 'beforeVote'.
		populateDropdownTemplate( 'event-types', WORKFLOWS_SETTINGS['event-types'] );
		
		populateDropdownTemplate( 'operators', false );
		
		var $form			= $( '#workflows-page' ),
			$variableTypes	= $( '<select class="workflow-template" data-class="variable-types"></select>' ).appendTo( $form ),
			variableTypes	= WORKFLOWS_SETTINGS['variable-types'];
	
		for ( var variableId in variableTypes ) {
			var variableType = variableTypes[ variableId ];

			$variableTypes.append( '<option value="' + variableId + '">' + variableType.title + '</option>' );
			
			if ( 'dropdown' === variableType.field.type ) {
				$form.append( '<select class="workflow-template" data-class="' + variableId + '"></select>' );
	
				// Create the template <option> HTML element containing all values of this variable type.
				populateDropdownTemplate( variableId, variableType.values );
			} else {
				$form.append( '<input type="' + variableType.dataType + '" class="workflow-template" data-class="' + variableId + '" />' );
			}
		}
		
		/*
		 * After creating the template <option> HTML elements containing the supported variable types,
		 * create the template condition HTML element containing a dropdown list of variable types.
		 */
		$( '.workflow-template[data-class="operation"] > .col' ).append( createFromTemplate( 'variable-types' ) );
	}
	
	/**
	 * Creates the items of the workflows list. 
	 */
	function populateWorkflowsList() {
		var workflows		= WORKFLOWS_SETTINGS.workflows,
			$workflowsPanel = $( '#workflows > .panel' ),
			$listGroup		= $workflowsPanel.children( '.list-group' );

		if ( Object.keys( workflows ).length > 0 ) {
			$workflowsPanel.show().find( '> .panel-heading' ).text( WORKFLOWS_SETTINGS.text.has_workflows );
			
			var workflowIds = WORKFLOWS_SETTINGS.workflows_id_order;
			if ( ! workflowIds || 0 === workflowIds.length ) {
				workflowIds = Object.keys( workflows );
			}

			for ( var idx in workflowIds ) {
				var workflowId	= workflowIds[ idx ],
					workflow	= workflows[ workflowId ];

				var $listGroupItemTemplate = createFromTemplate( 'list-group-item' );
				$listGroupItemTemplate.attr( 'data-id', workflowId );
				
				$listGroupItemTemplate.find( '.list-group-item-content' ).html( workflow.name );
				if ( workflow.active ) {
					$listGroupItemTemplate.find( '.workflow-state').prop( 'checked', true );
				}
				
				$listGroup.append( $listGroupItemTemplate );
			}
		} else {
			$workflowsPanel.find( '> .panel-heading' ).text( WORKFLOWS_SETTINGS.text.no_workflows );
		}
	}
	
	/**
	 * Populates a select HTML element based on the given HTML element class and values array.
	 * 
	 * @param String elementClass The HTML element's class
	 * @param Array itemsArray An array of values that will be added as options of the select HTML element.
	 */
	function populateDropdownTemplate( elementClass, itemsArray ) {
		var $element = $('select.workflow-template[data-class="' + elementClass + '"]');
		
		// Create the element if it doesn't exist and append it to the form.
		if ( ! $element.length ) {
			$element = $( '<select class="workflow-template" data-class="' + elementClass + '"></select>' ).appendTo( $( '#workflows-page' ) );
		}
		
		$element.html('');
		
		if ( false !== itemsArray ) {
			for ( var idx in itemsArray ) {
				var item = itemsArray[ idx ];
				$element.append('<option value="' + idx + '">' + item.title +'</option>');
			}
		}
	}
}) (jQuery);